import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useClipboard } from './useClipboard'

describe('复制结果与生命周期', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('window', globalThis)
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  function fallback(result: boolean | Error) {
    const textarea = { value: '', style: {}, select: vi.fn() }
    const removeChild = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('无权限')) } })
    vi.stubGlobal('document', {
      createElement: () => textarea,
      body: { appendChild: vi.fn(), removeChild },
      execCommand: vi.fn(() => { if (result instanceof Error) throw result; return result }),
    })
    return { removeChild, textarea }
  }

  it('降级复制返回 false 时不得提示成功', async () => {
    const { removeChild, textarea } = fallback(false)
    const scope = effectScope()
    const clipboard = scope.run(() => useClipboard())!
    expect(await clipboard.copy('测试')).toBe(false)
    expect(clipboard.copied.value).toBe(false)
    expect(clipboard.failed.value).toBe(true)
    expect(removeChild).toHaveBeenCalledWith(textarea)
    scope.stop()
  })

  it('降级复制抛错时清除临时元素并返回失败', async () => {
    const { removeChild } = fallback(new Error('失败'))
    const scope = effectScope()
    const clipboard = scope.run(() => useClipboard())!
    expect(await clipboard.copy('测试')).toBe(false)
    expect(removeChild).toHaveBeenCalledOnce()
    scope.stop()
  })

  it('成功状态到期复位，scope 销毁时清除计时器', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => {}) } })
    const scope = effectScope()
    const clipboard = scope.run(() => useClipboard(100))!
    expect(await clipboard.copy('测试')).toBe(true)
    expect(clipboard.copied.value).toBe(true)
    await vi.advanceTimersByTimeAsync(100)
    expect(clipboard.copied.value).toBe(false)
    await clipboard.copy('再复制')
    scope.stop()
    expect(vi.getTimerCount()).toBe(0)
  })
})
