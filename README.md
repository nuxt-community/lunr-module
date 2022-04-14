# lunr.js module

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Circle CI][circle-ci-src]][circle-ci-href]
[![Codecov][codecov-src]][codecov-href]
[![License][license-src]][license-href]

> Full-text search with pre-build indexes for Nuxt.js using [lunr.js](https://lunrjs.com/)

During the build phase of Nuxt.js you can add documents to the search index builder by calling the nuxt hook `lunr:document`. If you have configured and pass a [supported][lunr-supported-lang] locale along the document, the index will be build using the lunr stemmer for the specified language. As the lunr search index only holds references to your documents, you can optionally pass a meta prop along with the document which will be added to the search index as well.

[📖 **Release Notes**](./CHANGELOG.md)

## Setup

1. Add `@nuxtjs/lunr-module` dependency to your project

```bash
$ yarn add @nuxtjs/lunr-module # or npm install @nuxtjs/lunr-module
```

2. Add `@nuxtjs/lunr-module` to the `modules` section of `nuxt.config.js`

```js
{
  modules: [
    // Simple usage
    '@nuxtjs/lunr-module',

    // With options
    {
      src: '@nuxtjs/lunr-module',
      // These are the default options:
      /*
      options: {
        includeComponent: true,
        globalComponent: false,
        css: true,
        defaultLanguage: 'en',
        languages: false,
        path: 'search-index',
        ref: 'id',
        fields: [
          'title',
          'body'
        ]
      } */
    }
  ]
}
```

## Documentation

### Adding documents to search index

Add documents by calling the nuxt hook `lunr:documents` as follows:

```js
const document = {
  id: 1,
  title: 'My Title',
  body: 'The body'
}

const meta = {
  href: '/link/to/page',
  title: document.title
}

nuxt.callHook('lunr:document', ({
  locale: 'af', // optional, default en
  document,
  meta // optional
}))
```

#### Locale support

By configuring the locales options you can indicate for which [supported][lunr-supported-lang] languages a search index should be created. If you pass any other locale with a document it will be added to the [`defaultLanguage`](#defaultlanguage) search index (and a warning will be printed).

> Multiple languages equals multiple search indexes

English is supported by default in Lunr, when you only have English documents you dont have to configure or pass any locale.

##### Language vs Locale

A locale can consist of just a language or include a territory, you can use either of them. So both just the language (e.g. _nl_) as including the territory (e.g. _nl_NL_) will work

##### nuxt-i18n integration

If this module detects your project uses [nuxt-i18n](https://github.com/nuxt-community/nuxt-i18n) then the configured locales for nuxt-i18n will be automatically added. You dont have to configure the locales you use twice unless you want to use different locales (e.g. only one) for the search index.

### Add a search component to your website

This module includes a search component which you can use on your website. Use it's default slot to display your search results using the properties passed in the meta prop

```vue
<template>
  <lunr-search :lang="lang">
    <template v-slot:default="{ result, index, maxScore, meta }">
      <nuxt-link :to="meta.href">
        {{ meta.title }}
        <span>score: {{ Math.round(100 * result.score / maxScore) }}%</span>
      </nuxt-link>
    </template>
  </lunr-search>
</template>

<script>
export default {
  components: {
    // Note: 'lunr-module' below is a custom webpack alias and
    // does NOT refer to the folder in node_modules
    LunrSearch: () => import('lunr-module/search')
  }
}
</script>
```

## Performance considerations

### Use an integer as document reference

The document reference (defined by [option.ref](#ref)) is used in the search index to link all stemmed word segments. If you would use e.g. the page path as the document reference, then for a page with path `/en/offices/emea/nl/contact` that string value will be used to link all the stemmed word segments. This could increases the size of the search index massively, therefor its recommended to create a numeric document reference and use the `meta` property to add the page path for that document reference only once to the search index.

### Load search component dynamically
Lunr doesnt export ES6 modules and can't be tree-shaked. Using this module adds `~8.5KB` + `~2KB` for every other language then English to your bundle (gzipped). See example above for a dynamic import which makes sure the lunr imports are not included in your vendors bundle

### Keep an eye on the search index size in general
The search index is saved as a json file and thus needs to be parsed on the client. If the json of your search index becomes very large it could be an issue on (mobile) clients. E.g. Safari on iOS limits each top-level entry-point to run for max 10 seconds. See [this](https://github.com/olivernn/lunr.js/issues/330) Lunr.js issue for a possible workaround.

## Reference

### Options

#### includeComponent
- type `Boolean`
- default `true`

If true then the default search component will be added to your Nuxt project

> You can import the component using the webpack alias `lunr-module/search`

#### globalComponent
- type `Boolean`, `String`
- default `false`

If truthy then a plugin will be added to your project which installs the search component globally

> Setting this option implies `includeComponent: true`

By default the search component will be registered as `lunr-search`, if you wish this name you can set this option to a string with the name you wish to use

```js
  globalComponent: 'my-global-lunr-search'
...
<template>
  <my-global-lunr-search :lang="lang" class="my-search" />
</template>
```

#### css
- type `Boolean`
- default `true`

If the search component is included, this option determines if the default css styles should be included or not

#### defaultLanguage
- type `String`
- default `'en'`

The default language to use. This is also the fall-back language if you pass a document with a non-supported locale

#### languages
- type `String`, `Array`
- default `undefined`

A string or array of the languages for which a search index needs to be created.

Although this option might look redundant (i.e. why not just create a search index for every language which is passed), it provides a check to prevent 'rogue' documents from being indexed into a separate index.

#### languageStemmerMap
- type `Object`
- default `{}`

An object which contains a map of unsupported languages to supported stemming languages (by lunr). Use this to specify which stemming language should be used if you want to build a search index for a language which is not supported by lunr (yet).

#### path
- type `String`
- default `search-index`

On build of your project the created search indexes will be emitted as webpack assets. This option determines the path under `nuxt.publicPath` should be used.

> With default configurations for Nuxt.js and this module the English search index is available under `/_nuxt/search-index/en.json`

#### ref
- type `String`
- default `id`

The name of the property in your document which specifies what as reference should be used for this document in the search index

#### fields
- type `Array`
- default `['title', 'body']`

The property names in your document which will be indexed

#### placeholderText
- type `String`
- default `Search`

The text that is put in the placeholder of the search input field. If you are using nuxt-i18n, you can also provide a translation with key `lunr-module.placeholderText`

#### statusMessages
- type `Array<String>`
- default `{
  fetching: 'Fetching search index',
  loading: 'Loading search index',
  searching: 'Searching...',
  noresults: 'No results found'
}`

The status messages which are displayed during the search life cycle. If you are using nuxt-i18n, you can also provide a translation with key `lunr-module.${key}`. Eg use `lunr-module.noresults` to provide a translation for the no results found status.

### Hooks (Listening)

> use `nuxt.callHook(<name>, <arg>)` if you wish to use these hooks

#### lunr:document
- arg: `({ locale?, document, meta? })`

The main hook which is used to add documents to the search index. You need to pass an object as described. Both locale as meta are optional. If no locale is passed the `defaultLanguage` will be used

### Hooks (Emitting)

> use `nuxt.hook(<name>, <callback>)` if you wish to use these hooks. The callback function receives the listed arguments

#### lunr:index:beforeCreate
- arg: `({ locale, builder })`

> Use this hook if you e.g. want to register custom lunr plugins

This hook is called after the lunr builder is instantiated but before language plugins have been added or any refs and fields are set

#### lunr:index:created
- arg: `({ locale, builder })`

> Use this hook if you e.g. want to add extra documents to an index

This hook is called when the lunr builder has been setup, just before the documents are added to the index.

#### lunr:index:done
- arg: `({ locale, builder, index })`

> Use this hook if you wish to interact with the index before exporting it

This hook is called just before the index is exported as an json object

#### lunr:asset
- arg: `({ locale, json })`

> Use this hook if you wish to manipulate the json which is emitted as search index for the locale

This hook is called during webpack compilation just before the search index is prepared to be emitted as asset

## Development

1. Clone this repository
2. Install dependencies using `yarn install` or `npm install`
3. Start development server using `npm run dev`

## License

[MIT License](./LICENSE)

Copyright (c) pimlie

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@nuxtjs/lunr-module/latest.svg?style=flat-square
[npm-version-href]: https://npmjs.com/package/@nuxtjs/lunr-module

[npm-downloads-src]: https://img.shields.io/npm/dt/@nuxtjs/lunr-module.svg?style=flat-square
[npm-downloads-href]: https://npmjs.com/package/@nuxtjs/lunr-module

[circle-ci-src]: https://img.shields.io/circleci/project/github/nuxt-community/lunr-module.svg?style=flat-square
[circle-ci-href]: https://circleci.com/gh/nuxt-community/lunr-module

[codecov-src]: https://img.shields.io/codecov/c/github/nuxt-community/lunr-module.svg?style=flat-square
[codecov-href]: https://codecov.io/gh/nuxt-community/lunr-module

[license-src]: https://img.shields.io/npm/l/@nuxtjs/lunr-module.svg?style=flat-square
[license-href]: https://npmjs.com/package/@nuxtjs/lunr-module

[lunr-supported-lang]: https://lunrjs.com/guides/language_support.html
