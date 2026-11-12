import { effectScope, ref, toRaw, watch, type Ref } from 'vue'
import { STORAGE_KEYS, DEFAULT_TIMEZONES } from '@/lib/constants'
import type { UserSettings } from '@/types'

const DEFAULTS: UserSettings = {
  selectedTimezones: [...DEFAULT_TIMEZONES],
  timeFormat: '24h',
  theme: 'system',
  tsUnit: 'auto',
  defaultTimezone: 'Asia/Shanghai',
  defaultFormat: 'YYYY-MM-DD HH:mm:ss',
  language: 'system',
  defaultTab: 'clock',
}

interface CacheEntry {
  ref: Ref<unknown>
  fallback: unknown
  suppressWrite: boolean
  revision: number
  writeTimer: ReturnType<typeof setTimeout> | null
  writes: WriteSnapshot[]
}

interface WriteSnapshot {
  signature: string | null
  revision: number
  expiresAt: number
}

const MAX_WRITE_SNAPSHOTS = 32
const PENDING_WRITE_TTL_MS = 30_000
const SETTLED_WRITE_TTL_MS = 2_000

const cache = new Map<string, CacheEntry>()
// 模块缓存的监听器不能跟随首次调用组件一起销毁。
const storageScope = effectScope(true)
let listenerInstalled = false

function clonePlainValue(value: unknown): unknown {
  const raw = toRaw(value)
  if (Array.isArray(raw)) return [...raw]
  if (raw && typeof raw === 'object') {
    return { ...(raw as Record<string, unknown>) }
  }
  return raw
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isOneOf(value: unknown, allowed: readonly string[]) {
  return typeof value === 'string' && allowed.includes(value)
}

function isTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}

function normalizeStoredValue(key: string, value: unknown, fallback: unknown) {
  const fallbackValue = clonePlainValue(fallback)

  switch (key) {
    case STORAGE_KEYS.selectedTimezones:
      return isStringArray(value) ? [...new Set(value.filter(isTimezone))] : fallbackValue
    case STORAGE_KEYS.timeFormat:
      return isOneOf(value, ['12h', '24h']) ? value : fallbackValue
    case STORAGE_KEYS.theme:
      return isOneOf(value, ['system', 'light', 'dark']) ? value : fallbackValue
    case STORAGE_KEYS.tsUnit:
      return isOneOf(value, ['auto', 's', 'ms']) ? value : fallbackValue
    case STORAGE_KEYS.language:
      return isOneOf(value, ['system', 'en', 'zh']) ? value : fallbackValue
    case STORAGE_KEYS.defaultTab:
      return isOneOf(value, ['clock', 'timestamp']) ? value : fallbackValue
    case STORAGE_KEYS.defaultTimezone:
      return isTimezone(value) ? value : fallbackValue
    case STORAGE_KEYS.defaultFormat:
      return typeof value === 'string' ? value : fallbackValue
    default:
      return clonePlainValue(value ?? fallbackValue)
  }
}

function areaName(key: string) {
  return key === STORAGE_KEYS.windowBounds ? 'local' : 'sync'
}

function getArea(key: string): chrome.storage.StorageArea | undefined {
  return typeof chrome === 'undefined' ? undefined : chrome.storage?.[areaName(key)]
}

function cancelWrite(entry: CacheEntry) {
  if (entry.writeTimer !== null) clearTimeout(entry.writeTimer)
  entry.writeTimer = null
}

function valueSignature(value: unknown): string | null {
  try {
    return JSON.stringify(toRaw(value)) ?? null
  } catch {
    return null
  }
}

function pruneWrites(entry: CacheEntry) {
  const now = Date.now()
  entry.writes = entry.writes.filter((write) => write.expiresAt > now)
}

function isOlderWriteEcho(entry: CacheEntry, value: unknown) {
  pruneWrites(entry)
  const signature = valueSignature(value)
  if (signature === null) return false
  const index = entry.writes.findIndex((write) => write.signature === signature)
  if (index < 0) return false
  const [write] = entry.writes.splice(index, 1)
  return write.revision < entry.revision
}

function applyExternalValue(entry: CacheEntry, key: string, value: unknown) {
  entry.revision++
  cancelWrite(entry)
  const normalized = normalizeStoredValue(key, value, entry.fallback)
  entry.suppressWrite = true
  try {
    entry.ref.value = normalized
  } finally {
    entry.suppressWrite = false
  }
}

function installListenerOnce() {
  if (listenerInstalled) return
  if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return
  chrome.storage.onChanged.addListener((changes, changedArea) => {
    for (const [key, change] of Object.entries(changes)) {
      const entry = cache.get(key)
      if (!entry || areaName(key) !== changedArea) continue
      // onChanged 没有来源 ID；仅在有限记录窗口内识别一次本窗口的旧写入回声。
      if (isOlderWriteEcho(entry, change.newValue)) continue
      applyExternalValue(entry, key, change.newValue)
    }
  })
  listenerInstalled = true
}

export function useStoredValue<K extends keyof UserSettings>(
  key: K,
): Ref<UserSettings[K]>
export function useStoredValue<T>(key: string, fallback: T): Ref<T>
export function useStoredValue(key: string, fallback?: unknown) {
  const initial =
    fallback !== undefined
      ? fallback
      : (DEFAULTS as unknown as Record<string, unknown>)[key]
  const existing = cache.get(key)
  if (existing) return existing.ref

  const normalizedInitial = normalizeStoredValue(key, initial, initial)
  const r = ref(normalizedInitial) as Ref<unknown>
  const entry: CacheEntry = {
    ref: r,
    fallback: normalizedInitial,
    suppressWrite: false,
    revision: 0,
    writeTimer: null,
    writes: [],
  }
  cache.set(key, entry)

  storageScope.run(() => watch(
    r,
    (val) => {
      if (entry.suppressWrite) return
      entry.revision++
      cancelWrite(entry)
      if (!getArea(key)) return
      entry.writeTimer = setTimeout(() => {
        entry.writeTimer = null
        void persistValue(key, entry, normalizeStoredValue(key, val, normalizedInitial))
      }, 80)
    },
    { deep: true, flush: 'sync' },
  ))

  installListenerOnce()
  void loadInitialValue(key, entry)

  return r
}

async function loadInitialValue(key: string, entry: CacheEntry) {
  const revision = entry.revision
  try {
    const stored = await getArea(key)?.get([key])
    if (stored && key in stored && entry.revision === revision) {
      applyExternalValue(entry, key, stored[key])
    }
  } catch {
    // 读取失败时保留当前值；后续编辑仍可重试写入。
  }
}

async function persistValue(key: string, entry: CacheEntry, value: unknown) {
  pruneWrites(entry)
  const write: WriteSnapshot = {
    signature: valueSignature(value),
    revision: entry.revision,
    expiresAt: Date.now() + PENDING_WRITE_TTL_MS,
  }
  entry.writes.push(write)
  if (entry.writes.length > MAX_WRITE_SNAPSHOTS) entry.writes.shift()
  try {
    await getArea(key)?.set({ [key]: value })
    // 事件可能晚于 set() 完成到达；只保留短暂宽限期，避免误判未来外部同值变更。
    write.expiresAt = Date.now() + SETTLED_WRITE_TTL_MS
  } catch {
    entry.writes = entry.writes.filter((pending) => pending !== write)
    // 配额或浏览器关闭导致的失败不能成为未处理的 Promise 拒绝。
  }
}

export function useSettings() {
  return {
    selectedTimezones: useStoredValue('selectedTimezones'),
    timeFormat: useStoredValue('timeFormat'),
    theme: useStoredValue('theme'),
    tsUnit: useStoredValue('tsUnit'),
    defaultTimezone: useStoredValue('defaultTimezone'),
    defaultFormat: useStoredValue('defaultFormat'),
    language: useStoredValue('language'),
    defaultTab: useStoredValue('defaultTab'),
  }
}
