import { beforeEach, describe, expect, it, vi } from 'vitest'

type MessageHandler = (message: unknown, sender: unknown, reply: (value: unknown) => void) => boolean
type WindowLike = { id?: number; width?: number; height?: number; left?: number; top?: number; state?: string }

function browserMock(saved: Record<string, unknown> = {}) {
  let message!: MessageHandler
  let removed!: (id: number) => void
  let boundsChanged!: (window: WindowLike) => void
  const storage = {
    get: vi.fn(async () => ({ ...saved })),
    set: vi.fn(async (values: Record<string, unknown>) => { Object.assign(saved, values) }),
    remove: vi.fn(async (key: string) => { delete saved[key] }),
  }
  const windows = {
    get: vi.fn(async (id: number) => ({ id })),
    update: vi.fn(async (id: number) => ({ id })),
    create: vi.fn(async (_options: unknown): Promise<WindowLike> => ({ id: 17 })),
    onRemoved: { addListener: (fn: typeof removed) => { removed = fn } },
    onBoundsChanged: { addListener: (fn: typeof boundsChanged) => { boundsChanged = fn } },
  }
  const api = {
    storage: { local: storage }, windows,
    runtime: {
      getURL: (url: string) => `extension://${url}`,
      onMessage: { addListener: (fn: MessageHandler) => { message = fn } },
    },
  }
  vi.stubGlobal('chrome', api)
  return {
    api, storage, windows,
    open: () => new Promise((resolve) => message({ type: 'OPEN_STANDALONE' }, {}, resolve)),
    removed: (id: number) => removed(id),
    boundsChanged: (window: WindowLike) => boundsChanged(window),
  }
}

async function settle() {
  for (let i = 0; i < 12; i++) await Promise.resolve()
}

describe('独立窗口运行时', () => {
  beforeEach(() => { vi.resetModules(); vi.unstubAllGlobals() })

  it('两个并发打开请求只创建一个窗口，后续打开聚焦原窗口', async () => {
    const browser = browserMock()
    let resolve!: (window: WindowLike) => void
    browser.windows.create.mockImplementation(() => new Promise((done) => { resolve = done }))
    await import('./service-worker')
    const first = browser.open()
    const second = browser.open()
    await settle()
    expect(browser.windows.create).toHaveBeenCalledOnce()
    resolve({ id: 17 })
    expect(await first).toEqual({ ok: true })
    expect(await second).toEqual({ ok: true })
    await browser.open()
    expect(browser.windows.create).toHaveBeenCalledOnce()
    expect(browser.windows.update).toHaveBeenCalledWith(17, { focused: true, drawAttention: true })
  })

  it('创建失败后下一次请求可以重试', async () => {
    const browser = browserMock()
    browser.windows.create.mockRejectedValueOnce(new Error('创建失败'))
    await import('./service-worker')
    expect(await browser.open()).toEqual({ ok: false, error: 'Error: 创建失败' })
    expect(await browser.open()).toEqual({ ok: true })
    expect(browser.windows.create).toHaveBeenCalledTimes(2)
  })

  it('恢复窗口时限制异常尺寸并丢弃不合理坐标', async () => {
    const browser = browserMock({ windowBounds: { width: -2, height: Infinity, left: 999999, top: 'bad' } })
    await import('./service-worker')
    await browser.open()
    expect(browser.windows.create).toHaveBeenCalledWith(expect.objectContaining({ width: 320, height: 560 }))
    const options = browser.windows.create.mock.calls[0][0] as WindowLike
    expect(options.left).toBeUndefined()
    expect(options.top).toBeUndefined()
  })

  it('保留合法负坐标并限制超大窗口', async () => {
    const browser = browserMock({ windowBounds: { width: 99999, height: 99999, left: -1200, top: 30 } })
    await import('./service-worker')
    await browser.open()
    expect(browser.windows.create).toHaveBeenCalledWith(expect.objectContaining({ width: 2560, height: 1600, left: -1200, top: 30 }))
  })

  it('缺少 windows API 时后台可以加载并返回可读失败', async () => {
    const browser = browserMock()
    Reflect.deleteProperty(browser.api, 'windows')
    await import('./service-worker')
    expect(await browser.open()).toEqual(expect.objectContaining({ ok: false }))
  })

  it('边界与关闭事件的存储拒绝不会成为未处理拒绝', async () => {
    const browser = browserMock({ standaloneWindowId: 17 })
    await import('./service-worker')
    browser.storage.set.mockRejectedValue(new Error('写入失败'))
    browser.storage.remove.mockRejectedValue(new Error('删除失败'))
    browser.boundsChanged({ id: 17, width: 500, height: 600 })
    browser.removed(17)
    await settle()
    expect(browser.storage.set).toHaveBeenCalledWith({ windowBounds: { width: 500, height: 600, left: undefined, top: undefined } })
    expect(browser.storage.remove).toHaveBeenCalledWith('standaloneWindowId')
  })

  it('Firefox 缺少 onBoundsChanged 时仍可打开窗口', async () => {
    const browser = browserMock()
    Reflect.deleteProperty(browser.windows, 'onBoundsChanged')
    await import('./service-worker')
    expect(await browser.open()).toEqual({ ok: true })
  })
})
