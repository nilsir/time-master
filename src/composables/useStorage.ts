import { ref, watch, type Ref } from 'vue'
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
  suppressWrite: boolean
}

const cache = new Map<string, CacheEntry>()
let listenerInstalled = false

function getArea(key: string): chrome.storage.StorageArea {
  if (key === STORAGE_KEYS.windowBounds) return chrome.storage.local
  return chrome.storage.sync
}

function installListenerOnce() {
  if (listenerInstalled) return
  if (!chrome?.storage?.onChanged) return
  chrome.storage.onChanged.addListener((changes) => {
    for (const [key, change] of Object.entries(changes)) {
      const entry = cache.get(key)
      if (!entry) continue
      if ('newValue' in change) {
        entry.suppressWrite = true
        entry.ref.value = change.newValue
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

  const r = ref(initial) as Ref<unknown>
  const entry: CacheEntry = { ref: r, suppressWrite: false }
  cache.set(key, entry)

  if (chrome?.storage) {
    entry.suppressWrite = true
    getArea(key)
      .get([key])
      .then((res) => {
        entry.suppressWrite = true
        if (key in res && res[key] !== undefined) {
          r.value = res[key]
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
        getArea(key).set({ [key]: val })
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
