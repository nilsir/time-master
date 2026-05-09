import { ref, toRaw, watch, type Ref } from 'vue'
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
}

interface CacheEntry {
  ref: Ref<unknown>
  fallback: unknown
  suppressWrite: boolean
}

const cache = new Map<string, CacheEntry>()
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

function normalizeStoredValue(key: string, value: unknown, fallback: unknown) {
  const fallbackValue = clonePlainValue(fallback)

  switch (key) {
    case STORAGE_KEYS.selectedTimezones:
      return isStringArray(value) ? [...value] : fallbackValue
    case STORAGE_KEYS.timeFormat:
      return isOneOf(value, ['12h', '24h']) ? value : fallbackValue
    case STORAGE_KEYS.theme:
      return isOneOf(value, ['system', 'light', 'dark']) ? value : fallbackValue
    case STORAGE_KEYS.tsUnit:
      return isOneOf(value, ['auto', 's', 'ms']) ? value : fallbackValue
    case STORAGE_KEYS.language:
      return isOneOf(value, ['system', 'en', 'zh']) ? value : fallbackValue
    case STORAGE_KEYS.defaultTimezone:
    case STORAGE_KEYS.defaultFormat:
      return typeof value === 'string' ? value : fallbackValue
    default:
      return clonePlainValue(value ?? fallbackValue)
  }
}

function getArea(key: string): chrome.storage.StorageArea {
  if (key === STORAGE_KEYS.windowBounds) return chrome.storage.local
  return chrome.storage.sync
}

function applyExternalValue(entry: CacheEntry, key: string, value: unknown) {
  const normalized = normalizeStoredValue(key, value, entry.fallback)
  if (Object.is(toRaw(entry.ref.value), normalized)) {
    entry.suppressWrite = false
    return
  }

  entry.suppressWrite = true
  entry.ref.value = normalized
}

function installListenerOnce() {
  if (listenerInstalled) return
  if (!chrome?.storage?.onChanged) return
  chrome.storage.onChanged.addListener((changes) => {
    for (const [key, change] of Object.entries(changes)) {
      const entry = cache.get(key)
      if (!entry) continue
      if ('newValue' in change) {
        applyExternalValue(entry, key, change.newValue)
      }
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
  }
  cache.set(key, entry)

  if (chrome?.storage) {
    getArea(key)
      .get([key])
      .then((res) => {
        if (key in res && res[key] !== undefined) {
          applyExternalValue(entry, key, res[key])
        } else {
          entry.suppressWrite = false
        }
      })
    installListenerOnce()
  }

  let writeTimer: number | null = null
  watch(
    r,
    (val) => {
      if (entry.suppressWrite) {
        entry.suppressWrite = false
        return
      }
      if (!chrome?.storage) return
      if (writeTimer !== null) clearTimeout(writeTimer)
      writeTimer = window.setTimeout(() => {
        getArea(key).set({
          [key]: normalizeStoredValue(key, val, normalizedInitial),
        })
        writeTimer = null
      }, 80)
    },
    { deep: true },
  )

  return r
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
  }
}
