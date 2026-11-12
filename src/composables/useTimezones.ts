import { computed } from 'vue'
import { DEFAULT_TIMEZONES, TIMEZONE_CN_ALIASES } from '@/lib/constants'
import { tzCityName, utcOffsetLabel, timezoneOffsetMinutes } from '@/lib/time'
import { useNow } from './useNow'

export interface TimezoneEntry {
  tz: string; city: string; region: string; offsetLabel: string; offsetMinutes: number; haystack: string
}
let cachedList: TimezoneEntry[] = []
let cachedMinute = NaN
let ids: string[] | null = null
const aliasesById = new Map<string, string[]>()
function timezoneIds() {
  if (ids) return ids
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
  ids = [...new Set(['UTC', ...(intl.supportedValuesOf?.('timeZone') ?? DEFAULT_TIMEZONES)])]
  for (const [id, aliases] of Object.entries(TIMEZONE_CN_ALIASES)) {
    const canonical = new Intl.DateTimeFormat('en', { timeZone: id }).resolvedOptions().timeZone
    aliasesById.set(canonical, [...(aliasesById.get(canonical) ?? []), ...aliases, id])
    aliasesById.set(id, [...(aliasesById.get(id) ?? []), ...aliases])
  }
  return ids
}
export function getTimezoneList(at = Date.now()): TimezoneEntry[] {
  const minute = Math.floor(at / 60_000)
  if (minute === cachedMinute) return cachedList
  cachedList = timezoneIds().map(tz => {
    const region = tz.includes('/') ? tz.split('/')[0] : ''
    const city = tzCityName(tz)
    const offsetMinutes = timezoneOffsetMinutes(at, tz)
    const offsetLabel = utcOffsetLabel(at, tz)
    const haystack = [tz, city, region, offsetLabel, ...(aliasesById.get(tz) ?? [])].join(' ').toLowerCase()
    return { tz, city, region, offsetLabel, offsetMinutes, haystack }
  }).sort((a, b) => a.tz === 'UTC' ? -1 : b.tz === 'UTC' ? 1 : a.city.localeCompare(b.city, 'en'))
  cachedMinute = minute
  return cachedList
}
export function matchesTimezone(entry: TimezoneEntry, query: string): boolean {
  const q = query.trim().toLowerCase()
  const offset = q.match(/^(?:utc)?([+\-−])\s*(\d{1,2})(?::?(\d{2}))?$/)
  if (offset) {
    const h = Number(offset[2]), m = Number(offset[3] ?? 0)
    return m < 60 && h <= 23 && entry.offsetMinutes === (offset[1] === '+' ? 1 : -1) * (h * 60 + m)
  }
  return entry.haystack.includes(q)
}
export function useTimezones(query: () => string, at?: () => number) {
  const { now } = useNow()
  const all = computed(() => { const current = now.value; return getTimezoneList(at?.() ?? current) })
  const filtered = computed(() => all.value.filter(entry => matchesTimezone(entry, query())))
  const grouped = computed(() => {
    const groups = new Map<string, TimezoneEntry[]>()
    for (const entry of filtered.value) {
      const letter = entry.city[0]?.toUpperCase() ?? '#'
      const key = /[A-Z]/.test(letter) ? letter : '#'
      groups.set(key, [...(groups.get(key) ?? []), entry])
    }
    return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([letter, items]) => ({ letter, items }))
  })
  return { all, filtered, grouped }
}
