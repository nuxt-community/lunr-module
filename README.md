# lunr-module

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Circle CI][circle-ci-src]][circle-ci-href]
[![Codecov][codecov-src]][codecov-href]
[![License][license-src]][license-href]

> Add full-text search to your nuxt application

[📖 **Release Notes**](./CHANGELOG.md)

## Setup

1. Add `lunr-module` dependency to your project

```bash
yarn add lunr-module # or npm install lunr-module
```

2. Add `lunr-module` to the `modules` section of `nuxt.config.js`

```js
{
  modules: [
    // Simple usage
    'lunr-module',

    // With options
    ['lunr-module', { /* module options */ }]
  ]
}
```

## Development

1. Clone this repository
2. Install dependencies using `yarn install` or `npm install`
3. Start development server using `npm run dev`

## License

[MIT License](./LICENSE)

Copyright (c) pimlie <pimlie@hotmail.com>

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/lunr-module/latest.svg?style=flat-square
[npm-version-href]: https://npmjs.com/package/lunr-module

[npm-downloads-src]: https://img.shields.io/npm/dt/lunr-module.svg?style=flat-square
[npm-downloads-href]: https://npmjs.com/package/lunr-module

[circle-ci-src]: https://img.shields.io/circleci/project/github/pimlie/lunr-module.svg?style=flat-square
[circle-ci-href]: https://circleci.com/gh/pimlie/lunr-module

[codecov-src]: https://img.shields.io/codecov/c/github/pimlie/lunr-module.svg?style=flat-square
[codecov-href]: https://codecov.io/gh/pimlie/lunr-module

[license-src]: https://img.shields.io/npm/l/lunr-module.svg?style=flat-square
[license-href]: https://npmjs.com/package/lunr-module
