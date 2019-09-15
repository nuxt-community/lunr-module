import path from 'path'
import fs from 'fs'
import util from 'util'
import consola from 'consola'
import lunr from 'lunr'
import lunrStemmer from 'lunr-languages/lunr.stemmer.support'
import { placeholderText, statusMessages } from './constants'

const readDir = util.promisify(fs.readdir)
const logger = process.env.NODE_ENV === 'test' ? consola : consola.withScope('lunr-module')
const normalizeLanguage = locale => (locale || '').substr(0, 2).toLowerCase()

const defaultOptions = {
  includeComponent: true,
  globalComponent: false,
  css: true,
  defaultLanguage: 'en',
  languages: undefined,
  languageStemmerMap: {},
  path: 'search-index',
  placeholderText,
  statusMessages,
  ref: 'id',
  fields: [
    'title',
    'body'
  ]
}

module.exports = async function LunrModule (options = {}) {
  const nuxt = this.nuxt

  options = {
    ...defaultOptions,
    ...nuxt.options.lunr,
    ...options,
    supportedLanguages: []
  }

  if (options.path !== defaultOptions.path) {
    options.path = options.path.replace(/^\/+|\/+$/g, '')
  }

  const useI18N = nuxt.options.i18n && nuxt.options.i18n.locales.length
  let usedLocales
  /* istanbul ignore next */
  if (typeof options.languages === 'string') {
    usedLocales = [options.languages]
  } else if (Array.isArray(options.languages)) {
    usedLocales = options.languages
  /* istanbul ignore next */
  } else if (useI18N) {
    usedLocales = nuxt.options.i18n.locales
  }

  usedLocales = usedLocales.concat(Object.values(options.languageStemmerMap))

  if (Array.isArray(usedLocales)) {
    const allSupportedLanguages = []

    const languagesPath = path.dirname(require.resolve('lunr-languages/package.json'))
    if (languagesPath) {
      const files = await readDir(languagesPath)
      for (const file of files) {
        if (!file.startsWith('lunr.') || !file.endsWith('.js')) {
          continue
        }

        const [, language] = file.toLowerCase().split('.')

        if (language && language.length === 2) {
          allSupportedLanguages.push(language)
        }
      }
    }

    options.supportedLanguages = usedLocales
      .map((locale) => {
        locale = typeof locale === 'string' ? locale : locale.code

        const language = normalizeLanguage(locale)

        if (allSupportedLanguages.includes(language)) {
          return language
        }
      })
      .filter(Boolean)
  }

  if (options.defaultLanguage !== 'en' && !options.supportedLanguages.includes(options.defaultLanguage)) {
    options.defaultLanguage = defaultOptions.defaultLanguage
  }

  if (options.supportedLanguages.length) {
    lunrStemmer(lunr)
  }

  let metas
  const documents = {}
  nuxt.hook('lunr:document', ({ locale = 'en', document, meta } = {}) => {
    if (!document) {
      return
    }

    const language = normalizeLanguage(locale)
    let stemmerLanguage = options.languageStemmerMap[language] || language

    if (stemmerLanguage !== 'en' && !options.supportedLanguages.includes(stemmerLanguage)) {
      logger.warn(`locale '${locale}' not supported, falling back to ${options.defaultLanguage} for stemming`)
      stemmerLanguage = options.defaultLanguage

      options.languageStemmerMap[language] = stemmerLanguage
    }

    if (!documents[language]) {
      documents[language] = []
    }

    if (meta && (!metas || !metas[language])) {
      metas = metas || {}
      metas[language] = {}
    }

    const documentRef = document[options.ref]
    if (!documentRef) {
      logger.warn(`Unable to index document, does not contain a ref '${options.ref}'. Document:`, document)
      return
    }

    documents[language].push(document)

    if (meta) {
      metas[language][documentRef] = meta
    }
  })

  const webpackPlugin = compilation => createSearchIndexAssets(compilation, documents)
  this.options.build.plugins.push({
    apply (compiler) {
      compiler.hooks.emit.tapPromise('LunrModulePlugin', webpackPlugin)
    }
  })

  this.extendBuild((config) => {
    config.resolve.alias['lunr-module'] = path.join(this.options.buildDir, 'lunr')
  })

  if (options.includeComponent || options.globalComponent) {
    this.addTemplate({
      src: path.resolve(__dirname, 'icon-search.svg'),
      fileName: 'lunr/icon-search.svg'
    })

    this.addTemplate({
      src: path.resolve(__dirname, 'search.vue'),
      fileName: 'lunr/search.vue',
      options: {
        ...options,
        useI18N,
        publicPath: nuxt.options.build.publicPath
      }
    })
  }

  if (options.globalComponent) {
    this.addPlugin({
      src: path.resolve(__dirname, 'plugin.js'),
      fileName: 'lunr/plugin.js',
      options
    })
  }

  async function createSearchIndex (language, documents) {
    // retrieve the mapped language we should use for stemming
    const stemmerLanguage = options.languageStemmerMap[language]

    // this will be set to false for en, but en is supported by default
    // and doesnt require any extra lunr modules
    const isSupportedLanguage = options.supportedLanguages.includes(stemmerLanguage)

    if (isSupportedLanguage && !lunr[stemmerLanguage]) {
      const lunrLanguage = await import(`lunr-languages/lunr.${stemmerLanguage}`).then(m => m.default || m)
      lunrLanguage(lunr)
    }

    let lunrBuilder
    lunr(builder => (lunrBuilder = builder))
    await nuxt.callHook('lunr:index:beforeCreate', {
      locale: language,
      stemmerLanguage,
      builder: lunrBuilder
    })

    if (isSupportedLanguage) {
      lunrBuilder.use(lunr[stemmerLanguage])
    }

    lunrBuilder.ref(options.ref)
    for (const field of options.fields) {
      lunrBuilder.field(field)
    }

    await nuxt.callHook('lunr:index:created', {
      locale: language,
      stemmerLanguage,
      builder: lunrBuilder
    })

    for (const document of documents) {
      lunrBuilder.add(document)
    }

    const searchIndex = lunrBuilder.build()

    await nuxt.callHook('lunr:index:done', {
      locale: language,
      stemmerLanguage,
      builder: lunrBuilder,
      index: searchIndex
    })

    return searchIndex.toJSON()
  }

  async function createSearchIndexAssets (compilation, documents) {
    for (const language in documents) {
      const searchJson = await createSearchIndex(language, documents[language])

      if (metas && metas[language]) {
        searchJson.metas = metas[language]
      }

      await nuxt.callHook('lunr:asset', {
        locale: language,
        json: searchJson
      })

      const jsonString = JSON.stringify(searchJson)

      compilation.assets[`${options.path}/${language}.json`] = {
        source: () => jsonString,
        size: () => jsonString.length
      }
    }
  }
}
