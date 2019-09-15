import { Nuxt, Builder, Generator } from 'nuxt-edge'
import { waitFor } from '@nuxt/utils-edge'
import consola from 'consola'
import getPort from 'get-port'
import { createBrowser } from 'tib'

jest.setTimeout(30000)
consola.mockTypes(() => jest.fn())

describe('basic', () => {
  let browser

  afterAll(async () => {
    await browser.close()
  })

  test('build fixture', async () => {
    const config = await import('../example/nuxt.config').then(m => m.default || m)
    config.dev = false

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
    browser.setLogLevel(['warn', 'error', 'log', 'info'])

    expect(consola.warn).toHaveBeenCalledTimes(2)
    expect(consola.warn).toHaveBeenCalledWith(expect.stringContaining('Unable to index document'), expect.anything())
    expect(consola.warn).toHaveBeenCalledWith(expect.stringContaining('locale \'fr\' not supported'))
  })

  test('search /en/', async () => {
    const url = browser.getUrl('/en/')
    const page = await browser.page(url)

    await waitFor(500)

    expect(await page.getText('h1')).toBe('Moonwalkers (en)')
    expect(await page.getAttribute('.lunr-input', 'placeholder')).toBe('search')
    expect(await page.getElementCount('.lunr-results li')).toBe(0)

    const input = page.document.querySelector('input')
    input.value = 'test'
    const event = new page.window.Event('input')
    input.dispatchEvent(event)

    await waitFor(500)

    expect(await page.getElementCount('.lunr-results li')).toBe(3)
  })

  test('search /af/', async () => {
    const url = browser.getUrl('/af/')
    const page = await browser.page(url)

    await waitFor(500)

    expect(await page.getText('h1')).toBe('Moonwalkers (af)')
    expect(await page.getAttribute('.lunr-input', 'placeholder')).toBe('zoek')
    expect(await page.getElementCount('.lunr-results li')).toBe(0)

    const input = page.document.querySelector('input')
    input.value = 'test'
    const event = new page.window.Event('input')
    input.dispatchEvent(event)

    await waitFor(500)

    expect(await page.getElementCount('.lunr-results li')).toBe(1)
  })
})
