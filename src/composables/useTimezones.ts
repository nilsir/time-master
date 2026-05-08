import { computed } from 'vue'
import dayjs from '@/lib/dayjs'
import { TIMEZONE_CN_ALIASES } from '@/lib/constants'
import { tzCityName, utcOffsetLabel } from '@/lib/time'

export interface TimezoneEntry {
  tz: string
  city: string
  region: string
  offsetLabel: string
  offsetMinutes: number
  haystack: string
}

let cachedList: TimezoneEntry[] | null = null

function buildList(): TimezoneEntry[] {
  const ids: string[] = (Intl as any).supportedValuesOf
    ? (Intl as any).supportedValuesOf('timeZone')
    : []
  const now = Date.now()
  const list: TimezoneEntry[] = ids.map((tz) => {
    const parts = tz.split('/')
    const region = parts.length > 1 ? parts[0] : ''
    const city = tzCityName(tz)
    const aliases = TIMEZONE_CN_ALIASES[tz] ?? []
    const offsetMinutes = dayjs(now).tz(tz).utcOffset()
    const offsetLabel = utcOffsetLabel(now, tz)
    const haystack = [tz, city, region, offsetLabel, ...aliases]
      .join(' ')
      .toLowerCase()
    return { tz, city, region, offsetLabel, offsetMinutes, haystack }
  })
  list.sort((a, b) => a.city.localeCompare(b.city, 'en'))
  return list
}

export function getTimezoneList(): TimezoneEntry[] {
  if (!cachedList) cachedList = buildList()
  return cachedList
}

export function useTimezones(query: () => string) {
  const all = getTimezoneList()
  const filtered = computed(() => {
    const q = query().trim().toLowerCase()
    if (!q) return all
    return all.filter((t) => {
      if (t.haystack.includes(q)) return true
      const offsetMatch = q.match(/^([+-−])\s*(\d{1,2})(?::?(\d{2}))?$/)
      if (offsetMatch) {
        const sign = offsetMatch[1] === '-' || offsetMatch[1] === '−' ? -1 : 1
        const h = parseInt(offsetMatch[2], 10)
        const m = offsetMatch[3] ? parseInt(offsetMatch[3], 10) : 0
        const target = sign * (h * 60 + m)
        return t.offsetMinutes === target
      }
      return false
    })
  })
  const grouped = computed(() => {
    const groups: Record<string, TimezoneEntry[]> = {}
    for (const t of filtered.value) {
      const letter = (t.city[0] ?? '#').toUpperCase()
      const key = /[A-Z]/.test(letter) ? letter : '#'
      ;(groups[key] ??= []).push(t)
    }
    return Object.keys(groups)
      .sort()
      .map((k) => ({ letter: k, items: groups[k] }))
  })
  return { all, filtered, grouped }
}
