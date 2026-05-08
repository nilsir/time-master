import dayjs from './dayjs'
import { DAY_START_HOUR, NIGHT_START_HOUR } from './constants'

export type TsUnit = 'ms' | 's' | 'invalid'

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

export function detectTsUnit(input: number | string): TsUnit {
  const s = String(input).trim()
  if (!/^-?\d+$/.test(s)) return 'invalid'
  const n = Number(s)
  if (!Number.isFinite(n)) return 'invalid'
  const abs = Math.abs(n).toString().length
  if (abs <= 11) return 's'
  if (abs === 12 || abs === 13) return 'ms'
  return 'invalid'
}

export function toMillis(input: number | string): number | null {
  const unit = detectTsUnit(input)
  if (unit === 'invalid') return null
  const n = Number(input)
  return unit === 's' ? n * 1000 : n
}

export function formatTimestamp(
  ts: number | string,
  tz: string,
  fmt: string,
): ParseResult<string> {
  const ms = toMillis(ts)
  if (ms === null) return { ok: false, error: '无效时间戳' }
  try {
    const value = dayjs(ms).tz(tz).format(fmt)
    return { ok: true, value }
  } catch (e) {
    return { ok: false, error: `时区或格式无效：${(e as Error).message}` }
  }
}

export function parseToTimestamp(
  s: string,
  tz: string,
  fmt: string,
): ParseResult<number> {
  if (!s.trim()) return { ok: false, error: '请输入时间' }
  try {
    const d = dayjs.tz(s, fmt, tz)
    if (!d.isValid()) return { ok: false, error: '时间格式无法解析' }
    return { ok: true, value: d.valueOf() }
  } catch (e) {
    return { ok: false, error: `解析失败：${(e as Error).message}` }
  }
}

export function nowInTz(ms: number, tz: string) {
  return dayjs(ms).tz(tz)
}

export function utcOffsetLabel(ms: number, tz: string): string {
  const offsetMin = dayjs(ms).tz(tz).utcOffset()
  const sign = offsetMin >= 0 ? '+' : '−'
  const abs = Math.abs(offsetMin)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, '0')}`
}

export function relativeDayOffset(ms: number, tz: string): number {
  const local = dayjs(ms)
  const there = dayjs(ms).tz(tz)
  const localStart = local.startOf('day')
  const thereStart = dayjs.tz(there.format('YYYY-MM-DD 00:00:00'), tz)
  const diffMs = thereStart.valueOf() - localStart.valueOf()
  return Math.round(diffMs / (24 * 60 * 60 * 1000))
}

export function relativeDayLabel(ms: number, tz: string): string {
  const days = relativeDayOffset(ms, tz)
  if (days === 0) return '今天'
  if (days === 1) return '明天'
  if (days === -1) return '昨天'
  if (days > 1) return `${days} 天后`
  return `${Math.abs(days)} 天前`
}

export function hourOffsetFromLocal(ms: number, tz: string): number {
  const localOffset = dayjs(ms).utcOffset()
  const tzOffset = dayjs(ms).tz(tz).utcOffset()
  return Math.round((tzOffset - localOffset) / 60)
}

export function hourOffsetLabel(ms: number, tz: string): string {
  const h = hourOffsetFromLocal(ms, tz)
  if (h === 0) return '+0'
  return h > 0 ? `+${h}` : `−${Math.abs(h)}`
}

export function isDaytime(ms: number, tz: string): boolean {
  const hour = dayjs(ms).tz(tz).hour()
  return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR
}

export function tzCityName(tz: string): string {
  const last = tz.split('/').pop() ?? tz
  return last.replace(/_/g, ' ')
}
