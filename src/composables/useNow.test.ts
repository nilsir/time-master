import { afterEach, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('多个订阅者共享唯一实时计时器，并在全部卸载后停止', async () => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.setSystemTime(1_000)
  vi.stubGlobal('window', globalThis)
  const { useNow } = await import('./useNow')
  const firstScope = effectScope()
  const secondScope = effectScope()
  const first = firstScope.run(useNow)!
  const second = secondScope.run(useNow)!
  expect(first.now).toBe(second.now)
  expect(first).not.toHaveProperty('paused')
  expect(vi.getTimerCount()).toBe(1)
  await vi.advanceTimersByTimeAsync(1_000)
  expect(first.now.value).toBe(2_000)
  firstScope.stop()
  await vi.advanceTimersByTimeAsync(1_000)
  expect(second.now.value).toBe(3_000)
  secondScope.stop()
  expect(vi.getTimerCount()).toBe(0)
})
