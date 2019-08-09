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
      css: false,
      path: 'my-crazy-search-index-path',
      locales: ['en', 'nl'],
      fields: ['name', 'body']
    }
  }],
  hooks: {
    ready (nuxt) {
      let documentIndex = 1
      nuxt.callHook('lunr:document')

      for (const doc of docs) {
        nuxt.callHook('lunr:document', {
          locale: documentIndex % 2 ? 'en' : 'nl',
          document: {
            id: documentIndex,
            ...doc
          },
          meta: doc
        })
        documentIndex++
      }
    }
  }
}
