import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

function pageMock() {
  const page = new EventTarget() as EventTarget & {
    outerWidth: number; outerHeight: number; screenX: number; screenY: number
  }
  Object.assign(page, { outerWidth: 500, outerHeight: 600, screenX: -400, screenY: 50 })
  const set = vi.fn(async (_values: unknown) => {})
  vi.stubGlobal('window', page)
  vi.stubGlobal('chrome', { storage: { local: { set } } })
  return { page, set }
}

describe('独立页面窗口边界兜底保存', () => {
  beforeEach(() => { vi.resetModules(); vi.useFakeTimers() })
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals() })

  it('没有 windows API 的 Firefox 页面也能通过 resize 保存外框尺寸', async () => {
    const { page, set } = pageMock()
    const { useWindowBounds } = await import('./useWindowBounds')
    const scope = effectScope()
    scope.run(useWindowBounds)
    await vi.advanceTimersByTimeAsync(300)
    set.mockClear()
    page.outerWidth = 700
    page.dispatchEvent(new Event('resize'))
    await vi.advanceTimersByTimeAsync(300)
    expect(set).toHaveBeenLastCalledWith({ windowBounds: { width: 700, height: 600, left: -400, top: 50 } })
    scope.stop()
  })

  it('低频检查位置变化，pagehide 立即保存，并在销毁时清理', async () => {
    const { page, set } = pageMock()
    const { useWindowBounds } = await import('./useWindowBounds')
    const scope = effectScope()
    scope.run(useWindowBounds)
    await vi.advanceTimersByTimeAsync(300)
    set.mockClear()
    page.screenX = -800
    await vi.advanceTimersByTimeAsync(2_000)
    expect(set).toHaveBeenLastCalledWith({ windowBounds: { width: 500, height: 600, left: -800, top: 50 } })
    page.screenY = 80
    page.dispatchEvent(new Event('pagehide'))
    expect(set).toHaveBeenLastCalledWith({ windowBounds: { width: 500, height: 600, left: -800, top: 80 } })
    scope.stop()
    set.mockClear()
    page.dispatchEvent(new Event('resize'))
    await vi.advanceTimersByTimeAsync(3_000)
    expect(set).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('写入拒绝时不产生未处理拒绝，下次位置检查可以重试', async () => {
    const { set } = pageMock()
    set.mockRejectedValueOnce(new Error('关闭中'))
    const { useWindowBounds } = await import('./useWindowBounds')
    const scope = effectScope()
    scope.run(useWindowBounds)
    await vi.advanceTimersByTimeAsync(2_300)
    expect(set.mock.calls.length).toBeGreaterThanOrEqual(2)
    scope.stop()
  })
})
