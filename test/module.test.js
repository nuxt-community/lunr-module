import { Nuxt, Builder } from 'nuxt-edge'
import { waitFor } from '@nuxt/utils-edge'
import request from 'request-promise-native'
import getPort from 'get-port'

import config from '../example/nuxt.config'

jest.setTimeout(60000)
config.dev = false

let nuxt, port

const url = path => `http://localhost:${port}${path}`
const get = path => request(url(path))

describe('basic', () => {
  beforeAll(async () => {
    nuxt = new Nuxt(config)
    await nuxt.ready()

    await new Builder(nuxt).build()
    port = await getPort()

    await nuxt.listen(port)
  })

  afterAll(async () => {
    await nuxt.close()
  })

  test('render', async () => {
    const html = await get('/')
    expect(html).toContain('EN')
    expect(html).toContain('NL')
  })

  test('search /en/', async () => {
    const window = await nuxt.server.renderAndGetWindow(url('/en/'))
    const { document } = window

    await waitFor(500)

    expect(document.querySelectorAll('li').length).toBe(0)
    const input = document.querySelector('input')
    input.value = 'alan'

    const event = new window.Event('input')
    input.dispatchEvent(event)

    await waitFor(500)

    expect(document.querySelectorAll('li').length).toBe(1)
  })

  test('search /nl_NL/', async () => {
    const window = await nuxt.server.renderAndGetWindow(url('/nl_NL/'))
    const { document } = window

    await waitFor(500)

    expect(document.querySelectorAll('li').length).toBe(0)
    const input = document.querySelector('input')
    input.value = 'alan'

    const event = new window.Event('input')
    input.dispatchEvent(event)

    await waitFor(500)

    expect(document.querySelectorAll('li').length).toBe(2)
  })
})
