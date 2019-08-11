import { resolve } from 'path'
import docs from './docs'

export default {
  rootDir: resolve(__dirname, '..'),
  buildDir: resolve(__dirname, '.nuxt'),
  srcDir: __dirname,
  render: {
    resourceHints: false
  },
  modules: [{
    handler: require('../'),
    options: {
      globalComponent: 'global-lunr',
      css: false,
      path: 'my-crazy-search-index-path',
      defaultLanguage: 'fr',
      languages: ['en', 'nl'],
      fields: ['name', 'body']
    }
  }],
  hooks: {
    ready (nuxt) {
      let documentIndex = 1

      // this call is just for increasing coverage
      // (the example is also just as test fixture)
      nuxt.callHook('lunr:document')

      // trigger 'not adding doc' warning to increase coverage
      nuxt.callHook('lunr:document', {
        document: true
      })

      for (const doc of docs) {
        nuxt.callHook('lunr:document', {
          locale: documentIndex === 1 ? 'fr' : (documentIndex % 2 ? 'en' : 'nl_NL'),
          document: {
            id: documentIndex,
            ...doc
          },
          /* !! WARNING: Do NOT copy this blindly !!
           *
           * When adding the full document as meta the json of your
           * search index will become very large very easily. Parsing that
           * json on the client (especially mobile clients) could become a
           * performance issue
           *
           * Normally you'd only need to include 'enough' meta info to properly
           * recognise the document and to display your search results.
           * E.g. The path and title of the page the document refers to, but
           * _not_ the full text that was used for indexing
           */
          meta: doc
        })
        documentIndex++
      }
    }
  }
}
