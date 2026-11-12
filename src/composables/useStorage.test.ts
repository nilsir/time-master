import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'

type Changes = Record<string, { oldValue?: unknown; newValue?: unknown }>

function storageMock() {
  const listeners: ((changes: Changes, area: string) => void)[] = []
  const sync = { get: vi.fn(async () => ({})), set: vi.fn(async () => {}) }
  const local = { get: vi.fn(async () => ({})), set: vi.fn(async () => {}) }
  vi.stubGlobal('chrome', {
    storage: { sync, local, onChanged: { addListener: (fn: typeof listeners[number]) => listeners.push(fn) } },
  })
  return { sync, local, change: (changes: Changes, area = 'sync') => listeners.forEach((fn) => fn(changes, area)) }
}

describe('设置持久化生命周期与竞争', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.stubGlobal('window', globalThis)
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('首次组件卸载后，再次挂载仍然保存模块缓存中的设置', async () => {
    const { sync } = storageMock()
    const { useStoredValue } = await import('./useStorage')
    const first = effectScope()
    first.run(() => useStoredValue('theme'))
    await Promise.resolve()
    first.stop()
    const second = effectScope()
    const theme = second.run(() => useStoredValue('theme'))!
    theme.value = 'dark'
    await nextTick()
    await vi.advanceTimersByTimeAsync(80)
    expect(sync.set).toHaveBeenCalledWith({ theme: 'dark' })
    second.stop()
  })

  it('另一个窗口的变更取消当前窗口的旧待写任务', async () => {
    const { sync, change } = storageMock()
    const { useStoredValue } = await import('./useStorage')
    const theme = useStoredValue('theme')
    await Promise.resolve()
    theme.value = 'dark'
    await nextTick()
    change({ theme: { newValue: 'light' } })
    await nextTick()
    await vi.advanceTimersByTimeAsync(100)
    expect(theme.value).toBe('light')
    expect(sync.set).not.toHaveBeenCalled()
  })

  it('已经发出的旧写入回声不能覆盖或取消用户的新编辑', async () => {
    const { sync, change } = storageMock()
    let finish!: () => void
    sync.set.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve }))
    const { useStoredValue } = await import('./useStorage')
    const theme = useStoredValue('theme')
    await Promise.resolve()
    theme.value = 'dark'
    await vi.advanceTimersByTimeAsync(80)
    theme.value = 'light'
    finish()
    await Promise.resolve()
    change({ theme: { oldValue: 'system', newValue: 'dark' } })
    expect(theme.value).toBe('light')
    await vi.advanceTimersByTimeAsync(80)
    expect(sync.set).toHaveBeenLastCalledWith({ theme: 'light' })
  })

  it('确认一次写入回声后，相同值的后续外部变更仍生效', async () => {
    const { sync, change } = storageMock()
    const { useStoredValue } = await import('./useStorage')
    const theme = useStoredValue('theme')
    await Promise.resolve()
    theme.value = 'dark'
    await vi.advanceTimersByTimeAsync(80)
    change({ theme: { newValue: 'dark' } })
    theme.value = 'light'
    change({ theme: { newValue: 'dark' } })
    await vi.advanceTimersByTimeAsync(80)
    expect(theme.value).toBe('dark')
    expect(sync.set).toHaveBeenCalledTimes(1)
  })

  it('失败写入不会使同值的外部变更被当作旧回声忽略', async () => {
    const { sync, change } = storageMock()
    sync.set.mockRejectedValueOnce(new Error('写入失败'))
    const { useStoredValue } = await import('./useStorage')
    const theme = useStoredValue('theme')
    await Promise.resolve()
    theme.value = 'dark'
    await vi.advanceTimersByTimeAsync(80)
    theme.value = 'light'
    change({ theme: { newValue: 'dark' } })
    await vi.advanceTimersByTimeAsync(80)
    expect(theme.value).toBe('dark')
    expect(sync.set).toHaveBeenCalledTimes(1)
  })

  it('完成写入的回声记录短期过期，不会永久忽略同值外部变更', async () => {
    const { sync, change } = storageMock()
    const { useStoredValue } = await import('./useStorage')
    const theme = useStoredValue('theme')
    await Promise.resolve()
    theme.value = 'dark'
    await vi.advanceTimersByTimeAsync(2_100)
    theme.value = 'light'
    change({ theme: { newValue: 'dark' } })
    await vi.advanceTimersByTimeAsync(80)
    expect(theme.value).toBe('dark')
    expect(sync.set).toHaveBeenCalledTimes(1)
  })

  it('延迟初始化读取不会覆盖用户较新的编辑', async () => {
    const { sync } = storageMock()
    let resolve!: (value: Record<string, unknown>) => void
    sync.get.mockImplementation(() => new Promise((done) => { resolve = done }) as Promise<{}>)
    const { useStoredValue } = await import('./useStorage')
    const theme = useStoredValue('theme')
    theme.value = 'dark'
    resolve({ theme: 'light' })
    await nextTick()
    await vi.advanceTimersByTimeAsync(80)
    expect(theme.value).toBe('dark')
    expect(sync.set).toHaveBeenCalledWith({ theme: 'dark' })
  })

  it('延迟初始化读取不会覆盖较新的外部变更', async () => {
    const { sync, change } = storageMock()
    let resolve!: (value: Record<string, unknown>) => void
    sync.get.mockImplementation(() => new Promise((done) => { resolve = done }) as Promise<{}>)
    const { useStoredValue } = await import('./useStorage')
    const theme = useStoredValue('theme')
    change({ theme: { newValue: 'dark' } })
    resolve({ theme: 'light' })
    await Promise.resolve()
    expect(theme.value).toBe('dark')
  })

  it('只接收对应分区，删除时恢复默认值且不回写', async () => {
    const { sync, change } = storageMock()
    sync.get.mockResolvedValue({ theme: 'dark' })
    const { useStoredValue } = await import('./useStorage')
    const theme = useStoredValue('theme')
    await nextTick()
    change({ theme: { newValue: 'light' } }, 'local')
    expect(theme.value).toBe('dark')
    change({ theme: {} })
    await nextTick()
    await vi.advanceTimersByTimeAsync(100)
    expect(theme.value).toBe('system')
    expect(sync.set).not.toHaveBeenCalled()
  })

  it('校验时区并去重，同时保留空列表', async () => {
    const { sync, change } = storageMock()
    sync.get.mockResolvedValue({ selectedTimezones: ['UTC', 'UTC', 'Not/AZone', 'Asia/Shanghai'], defaultTimezone: 'bad' })
    const { useStoredValue } = await import('./useStorage')
    const zones = useStoredValue('selectedTimezones')
    const defaultZone = useStoredValue('defaultTimezone')
    await nextTick()
    expect(zones.value).toEqual(['UTC', 'Asia/Shanghai'])
    expect(defaultZone.value).toBe('Asia/Shanghai')
    change({ selectedTimezones: { newValue: [] } })
    expect(zones.value).toEqual([])
  })

  it('没有扩展 API 的预览环境可正常编辑', async () => {
    vi.stubGlobal('chrome', undefined)
    const { useStoredValue } = await import('./useStorage')
    const theme = useStoredValue('theme')
    theme.value = 'dark'
    await nextTick()
    expect(theme.value).toBe('dark')
  })

  it('读取和写入被拒绝后仍可继续编辑且无未处理拒绝', async () => {
    const { sync } = storageMock()
    sync.get.mockRejectedValue(new Error('读取失败'))
    sync.set.mockRejectedValue(new Error('写入失败'))
    const { useStoredValue } = await import('./useStorage')
    const theme = useStoredValue('theme')
    await Promise.resolve()
    theme.value = 'dark'
    await nextTick()
    await vi.advanceTimersByTimeAsync(80)
    sync.set.mockResolvedValue(undefined)
    theme.value = 'light'
    await nextTick()
    await vi.advanceTimersByTimeAsync(80)
    expect(sync.set).toHaveBeenLastCalledWith({ theme: 'light' })
  })
})
