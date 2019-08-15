import { Nuxt, Builder, Generator } from 'nuxt-edge'
import { waitFor } from '@nuxt/utils-edge'
import getPort from 'get-port'
import { createBrowser } from 'tib'

import config from '../example/nuxt.config'

jest.setTimeout(30000)
config.dev = false

describe('basic', () => {
  let browser

  beforeAll(async () => {
    const nuxt = new Nuxt(config)
    await nuxt.ready()

    const builder = await new Builder(nuxt)
    const generator = await new Generator(nuxt, builder)
    await generator.generate({ init: true, build: true })

    browser = await createBrowser('jsdom', {
      staticServer: {
        port: await getPort(),
        folder: nuxt.options.generate.dir
      }
    })
  })

  afterAll(async () => {
    await browser.close()
  })

  test('search /en/', async () => {
    const url = browser.getUrl('/en/')
    const page = await browser.page(url)

    await waitFor(500)

    expect(await page.getText('h1')).toBe('Moonwalkers (en)')
    expect(await page.getAttribute('.lunr-input', 'placeholder')).toBe('search')
    expect(await page.getElementCount('.lunr-results li')).toBe(0)

    const input = page.document.querySelector('input')
    input.value = 'alan'
    const event = new page.window.Event('input')
    input.dispatchEvent(event)

    await waitFor(500)

    expect(await page.getElementCount('.lunr-results li')).toBe(1)
  })

  test('search /nl_NL/', async () => {
    const url = browser.getUrl('/nl_NL/')
    const page = await browser.page(url)

    await waitFor(500)

    expect(await page.getText('h1')).toBe('Moonwalkers (nl_NL)')
    expect(await page.getAttribute('.lunr-input', 'placeholder')).toBe('zoek')
    expect(await page.getElementCount('.lunr-results li')).toBe(0)

    const input = page.document.querySelector('input')
    input.value = 'alan'
    const event = new page.window.Event('input')
    input.dispatchEvent(event)

    await waitFor(500)

    expect(await page.getElementCount('.lunr-results li')).toBe(2)
  })
})
