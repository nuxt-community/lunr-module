import path from 'path'
import fs from 'fs'
import util from 'util'
import lunr from 'lunr'
import lunrStemmer from 'lunr-languages/lunr.stemmer.support'

const readDir = util.promisify(fs.readdir)

const defaultOptions = {
  includeComponent: true,
  css: true,
  locales: false,
  path: 'search-index',
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

  const usedLocales = options.locales || (nuxt.options.i18n && nuxt.options.i18n.locales)

  if (Array.isArray(usedLocales)) {
    const allSupportedLanguages = []

    const languagesPath = path.dirname(require.resolve('lunr-languages/package.json'))
    if (languagesPath) {
      const files = await readDir(languagesPath)
      for (const file of files) {
        if (!file.endsWith('.js')) {
          continue
        }

        const [, language] = file.split('.')

        if (language && language.length === 2) {
          allSupportedLanguages.push(language)
        }
      }
    }

    options.supportedLanguages = usedLocales
      .map((locale) => {
        locale = typeof locale === 'string' ? locale : locale.code

        const language = locale.split('-').shift()
        if (allSupportedLanguages.includes(language)) {
          return language
        }
      })
      .filter(Boolean)
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

    if (!documents[locale]) {
      documents[locale] = []
    }

    if (meta && (!metas || !metas[locale])) {
      metas = metas || {}
      metas[locale] = {}
    }

    documents[locale].push(document)

    if (meta) {
      metas[locale][document[options.ref]] = meta
    }
  })

  const webpackPlugin = compilation => createSearchIndexAssets(compilation, documents)
  this.options.build.plugins.push({
    apply (compiler) {
      compiler.hooks.emit.tap('LunrModulePlugin', webpackPlugin)
    }
  })

  if (options.includeComponent) {
    this.addTemplate({
      src: path.resolve(__dirname, 'search.svg'),
      fileName: 'lunr/search.svg'
    })

    this.addTemplate({
      src: path.resolve(__dirname, 'search.vue'),
      fileName: 'lunr/search.vue',
      options: {
        ...options,
        publicPath: nuxt.options.build.publicPath
      }
    })

    this.addPlugin({
      src: path.resolve(__dirname, 'plugin.js'),
      fileName: 'lunr/plugin.js',
      options
    })
  }

  async function createSearchIndex (locale, documents) {
    const language = locale.split('-').shift()
    // this will be set to false for en, but en is supported by default
    // and doesnt require any extra lunr modules
    const isSupportedLanguage = options.supportedLanguages.includes(language)

    if (isSupportedLanguage && !lunr[language]) {
      const lunrLanguage = await import(`lunr-languages/lunr.${language}`).then(m => m.default || m)
      lunrLanguage(lunr)
    }

    let lunrBuilder
    lunr(builder => (lunrBuilder = builder))

    if (isSupportedLanguage) {
      lunrBuilder.use(lunr[language])
    }

    await nuxt.callHook('lunr:index:beforeCreate', lunrBuilder)

    lunrBuilder.ref(options.ref)
    for (const field of options.fields) {
      lunrBuilder.field(field)
    }

    await nuxt.callHook('lunr:index:created', lunrBuilder)

    for (const document of documents) {
      lunrBuilder.add(document)
    }

    await nuxt.callHook('lunr:index:done', lunrBuilder)

    const searchIndex = lunrBuilder.build()
    return searchIndex.toJSON()
  }

  async function createSearchIndexAssets (compilation, documents) {
    for (const locale in documents) {
      const searchJson = await createSearchIndex(locale, documents[locale])

      if (metas && metas[locale]) {
        searchJson.metas = metas[locale]
      }

      await nuxt.callHook('lunr:asset', {
        locale,
        json: searchJson
      })

      const jsonString = JSON.stringify(searchJson)

      compilation.assets[`${options.path}/${locale}.json`] = {
        source: () => jsonString,
        size: () => jsonString.length
      }
    }
  }
}
