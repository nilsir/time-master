import dayjs from './dayjs'
import { DAY_START_HOUR, NIGHT_START_HOUR } from './constants'

export type TsUnit = 'ms' | 's' | 'invalid'
export type InputUnit = 'auto' | 's' | 'ms'
export type TimeErrorKey = 'invalidTs' | 'inputRequired' | 'parseFailed' | 'tzOrFmtInvalid' | 'nonexistentTime' | 'invalidWorkHours'
export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: TimeErrorKey; detail?: string }
export interface ParsedInput { ms: number; kind: 's' | 'ms' | 'iso' | 'formatted'; candidates: number[] }
export interface WorkSlot { start: number; end: number }
const MINUTE = 60_000
const DAY = 86_400_000
const CANONICAL = 'YYYY-MM-DD HH:mm:ss.SSS'
export const DEFAULT_FORMAT = 'YYYY-MM-DD HH:mm:ss'

const zoneFormatters = new Map<string, Intl.DateTimeFormat>()
// 直接由 Intl 的字段计算偏移，避免 timezone 插件对负毫秒及 0–99 年的字符串回解析偏差。
function zoned(ms: number, tz: string) {
  let formatter = zoneFormatters.get(tz)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', era: 'short',
    })
    zoneFormatters.set(tz, formatter)
  }
  const parts = Object.fromEntries(formatter.formatToParts(ms).map(part => [part.type, part.value]))
  const wall = new Date(0)
  const year = parts.era === 'BC' ? 1 - Number(parts.year) : Number(parts.year)
  wall.setUTCFullYear(year, Number(parts.month) - 1, Number(parts.day))
  wall.setUTCHours(Number(parts.hour), Number(parts.minute), Number(parts.second), 0)
  const offset = (wall.valueOf() - Math.floor(ms / 1000) * 1000) / MINUTE
  // UTC 日期仅作为钟面载体；绝对时间和偏移分别保留，避开宿主时区的 DST 加法。
  const carrier = dayjs.utc(wall.valueOf() + (ms - Math.floor(ms / 1000) * 1000))
  const offsetSeconds = Math.round(Math.abs(offset) * 60)
  const sign = offset < 0 ? '-' : '+'
  const hh = String(Math.floor(offsetSeconds / 3600)).padStart(2, '0')
  const mm = String(Math.floor(offsetSeconds % 3600 / 60)).padStart(2, '0')
  const ss = offsetSeconds % 60
  function zoneName(style: 'short' | 'long') {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: style }).formatToParts(ms).find(part => part.type === 'timeZoneName')?.value ?? tz
  }
  return {
    isValid: () => carrier.isValid(),
    valueOf: () => ms,
    hour: () => carrier.hour(),
    minute: () => carrier.minute(),
    day: () => carrier.day(),
    utcOffset: () => offset,
    format: (fmt: string) => carrier.format(fmt.replace(/\[[^\]]*\]|ZZ?|zzz|z|X|x/g, token => {
      if (token.startsWith('[')) return token
      if (token === 'X') return '[' + Math.floor(ms / 1000) + ']'
      if (token === 'x') return '[' + ms + ']'
      if (token === 'z' || token === 'zzz') return '[' + zoneName(token === 'z' ? 'short' : 'long') + ']'
      const separator = token === 'Z' ? ':' : ''
      return '[' + sign + hh + separator + mm + (ss ? separator + String(ss).padStart(2, '0') : '') + ']'
    })),
  }
}
export function formatIso(ms: number): ParseResult<string> {
  return validMillis(ms) ? { ok: true, value: new Date(ms).toISOString() } : { ok: false, error: 'invalidTs' }
}
export function isValidTimezone(tz: string): boolean {
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true } catch { return false }
}
export function localTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}
function validMillis(ms: number): boolean {
  return Number.isSafeInteger(ms) && Math.abs(ms) <= 8_640_000_000_000_000
}
export function detectTsUnit(input: number | string): TsUnit {
  const s = String(input).trim()
  if (!/^-?\d+$/.test(s) || !Number.isSafeInteger(Number(s))) return 'invalid'
  const digits = Math.abs(Number(s)).toString().length
  return digits <= 11 ? 's' : digits <= 13 ? 'ms' : 'invalid'
}
export function toMillis(input: number | string, mode: InputUnit = 'auto'): number | null {
  if (!/^-?\d+$/.test(String(input).trim())) return null
  const unit = mode === 'auto' ? detectTsUnit(input) : mode
  const n = Number(input)
  if (unit === 'invalid' || !Number.isSafeInteger(n)) return null
  const ms = unit === 's' ? n * 1000 : n
  return validMillis(ms) ? ms : null
}
export function formatMillis(ms: number, tz: string, fmt = DEFAULT_FORMAT): ParseResult<string> {
  if (!validMillis(ms)) return { ok: false, error: 'invalidTs' }
  try {
    const d = zoned(ms, tz)
    if (!d.isValid() || !fmt.trim()) return { ok: false, error: 'tzOrFmtInvalid' }
    return { ok: true, value: d.format(fmt) }
  } catch (e) { return { ok: false, error: 'tzOrFmtInvalid', detail: (e as Error).message } }
}
export function formatTimestamp(ts: number | string, tz: string, fmt: string, mode: InputUnit = 'auto'): ParseResult<string> {
  const ms = toMillis(ts, mode)
  return ms === null ? { ok: false, error: 'invalidTs' } : formatMillis(ms, tz, fmt)
}

function strictUtc(input: string, fmt: string) {
  const parsed = dayjs.utc(input, fmt, true)
  if (parsed.isValid() || !fmt.includes('YYYY')) return parsed
  // 使用安全闰年作为占位，避免 0000 被解析成本年，以及 0–99 被补成 1900–1999。
  for (const match of input.matchAll(/00\d{2}/g)) {
    const year = Number(match[0])
    const safeYear = year + 2000
    const safeInput = input.slice(0, match.index) + safeYear + input.slice(match.index! + 4)
    const safe = dayjs.utc(safeInput, fmt, true)
    if (!safe.isValid() || safe.year() !== safeYear) continue
    const corrected = safe.toDate()
    corrected.setUTCFullYear(year)
    const repaired = dayjs.utc(corrected)
    if (repaired.format(fmt) === input) return repaired
  }
  return parsed
}

// 先校验钟面字段，再寻找能往返到相同钟面时间的偏移；不让库自动修正 DST 缺口。
export function resolveWallTime(input: string, tz: string, fmt = DEFAULT_FORMAT): ParseResult<number[]> {
  const s = input.trim()
  if (!s) return { ok: false, error: 'inputRequired' }
  if (!isValidTimezone(tz)) return { ok: false, error: 'tzOrFmtInvalid' }
  try {
    const wall = strictUtc(s, fmt)
    if (!wall.isValid() || !fmt.trim()) return { ok: false, error: 'parseFailed' }
    const wallMs = wall.valueOf()
    const offsets = new Set<number>()
    for (let hours = -48; hours <= 48; hours += 6) {
      offsets.add(zoned(wallMs + hours * 3_600_000, tz).utcOffset())
    }
    const canonical = wall.format(CANONICAL)
    const candidates = [...offsets].map(offset => wallMs - offset * MINUTE)
      .filter(ms => validMillis(ms) && zoned(ms, tz).format(CANONICAL) === canonical)
      .sort((a, b) => a - b)
    return candidates.length ? { ok: true, value: candidates } : { ok: false, error: 'nonexistentTime' }
  } catch { return { ok: false, error: 'parseFailed' } }
}

function offsetToken(fmt: string) {
  return [...fmt.matchAll(/(\[[^\]]*\])|ZZ?/g)].find(match => !match[1])
}
function parseOffsetTime(s: string, fmt: string): ParseResult<number> {
  const token = offsetToken(fmt)
  if (!token) return { ok: false, error: 'parseFailed' }
  try {
    for (const match of s.matchAll(/Z|[+-]\d{2}:?\d{2}/g)) {
      const raw = match[0]
      if (raw !== 'Z' && (token[0] === 'ZZ' ? raw.includes(':') : !raw.includes(':'))) continue
      const digits = raw.replace(/[^0-9]/g, '')
      const hours = Number(digits.slice(0, 2)), minutes = Number(digits.slice(2))
      if (raw !== 'Z' && (hours > 23 || minutes > 59)) continue
      // 偏移作为字面量参与严格往返校验，再单独换算绝对时刻。
      const neutralFmt = fmt.slice(0, token.index) + '[' + raw + ']' + fmt.slice(token.index! + token[0].length)
      const wall = strictUtc(s, neutralFmt)
      if (!wall.isValid()) continue
      const sign = raw.startsWith('-') ? -1 : 1
      const ms = wall.valueOf() - (raw === 'Z' ? 0 : sign * (hours * 60 + minutes) * MINUTE)
      return validMillis(ms) ? { ok: true, value: ms } : { ok: false, error: 'invalidTs' }
    }
  } catch { return { ok: false, error: 'parseFailed' } }
  return { ok: false, error: 'parseFailed' }
}
export function parseToTimestamp(s: string, tz: string, fmt: string): ParseResult<number> {
  if (!s.trim()) return { ok: false, error: 'inputRequired' }
  if (offsetToken(fmt)) return parseOffsetTime(s.trim(), fmt)
  const result = resolveWallTime(s, tz, fmt)
  return result.ok ? { ok: true, value: result.value[0] } : result
}
export function parseTimeInput(input: string, tz: string, fmt = DEFAULT_FORMAT, unit: InputUnit = 'auto'): ParseResult<ParsedInput> {
  const s = input.trim()
  if (!s) return { ok: false, error: 'inputRequired' }
  if (/^-?\d+$/.test(s)) {
    const ms = toMillis(s, unit)
    if (ms === null) return { ok: false, error: 'invalidTs' }
    return { ok: true, value: { ms, kind: unit === 'auto' ? detectTsUnit(s) as 's' | 'ms' : unit, candidates: [ms] } }
  }
  const iso = s.match(/^((?:\d{4}|[+-]\d{6})-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2})?(\.\d{1,3})?(Z|[+-]\d{2}:?\d{2})?$/)
  if (iso) {
    if (iso[4] && !iso[3]) return { ok: false, error: 'parseFailed' }
    const format = 'YYYY-MM-DDTHH:mm' + (iso[3] ? ':ss' : '') + (iso[4] ? '.' + 'S'.repeat(iso[4].length - 1) : '')
    // 统一补齐毫秒，避免不同位数的 S/SS 在严格解析中不对称。
    const normalized = iso[4] ? s.replace(iso[4], '.' + iso[4].slice(1).padEnd(3, '0')) : s
    const normalizedFmt = iso[4] ? format.replace(/S+$/, 'SSS') : format
    if (iso[5]) {
      const canonical = iso[1] + 'T' + iso[2] + (iso[3] ?? ':00') + (iso[4] ? '.' + iso[4].slice(1).padEnd(3, '0') : '.000') + 'Z'
      const wallMs = Date.parse(canonical)
      if (!validMillis(wallMs) || new Date(wallMs).toISOString() !== canonical) return { ok: false, error: 'parseFailed' }
      const offset = iso[5]
      const digits = offset.replace(/[^0-9]/g, '')
      const h = Number(digits.slice(0, 2)), m = Number(digits.slice(2))
      if (offset !== 'Z' && (h > 23 || m > 59)) return { ok: false, error: 'parseFailed' }
      const ms = wallMs - (offset === 'Z' ? 0 : (offset.startsWith('-') ? -1 : 1) * (h * 60 + m) * MINUTE)
      return validMillis(ms) ? { ok: true, value: { ms, kind: 'iso', candidates: [ms] } } : { ok: false, error: 'invalidTs' }
    }
    const r = resolveWallTime(normalized, tz, normalizedFmt)
    return r.ok ? { ok: true, value: { ms: r.value[0], kind: 'iso', candidates: r.value } } : r
  }
  if (offsetToken(fmt)) {
    const r = parseOffsetTime(s, fmt)
    return r.ok ? { ok: true, value: { ms: r.value, kind: 'formatted', candidates: [r.value] } } : r
  }
  const r = resolveWallTime(s, tz, fmt)
  return r.ok ? { ok: true, value: { ms: r.value[0], kind: 'formatted', candidates: r.value } } : r
}
export function nowInTz(ms: number, tz: string) { return zoned(ms, tz) }
function offsetText(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+'
  const seconds = Math.round(Math.abs(minutes) * 60)
  const h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60), sec = seconds % 60
  return sign + h + (m || sec ? ':' + String(m).padStart(2, '0') : '') + (sec ? ':' + String(sec).padStart(2, '0') : '')
}
export function timezoneOffsetMinutes(ms: number, tz: string): number {
  return zoned(ms, tz).utcOffset()
}
export function utcOffsetLabel(ms: number, tz: string): string {
  return 'UTC' + offsetText(zoned(ms, tz).utcOffset())
}
export function relativeDayOffset(ms: number, tz: string, referenceTz = localTimezone()): number {
  const there = strictUtc(zoned(ms, tz).format('YYYY-MM-DD'), 'YYYY-MM-DD').valueOf()
  const local = strictUtc(zoned(ms, referenceTz).format('YYYY-MM-DD'), 'YYYY-MM-DD').valueOf()
  return Math.round((there - local) / DAY)
}
export function hourOffsetFromLocal(ms: number, tz: string, referenceTz = localTimezone()): number {
  return (zoned(ms, tz).utcOffset() - zoned(ms, referenceTz).utcOffset()) / 60
}
export function hourOffsetLabel(ms: number, tz: string, referenceTz = localTimezone()): string {
  return offsetText(Math.round(hourOffsetFromLocal(ms, tz, referenceTz) * 60))
}
export function isDaytime(ms: number, tz: string): boolean {
  const hour = zoned(ms, tz).hour()
  return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR
}
export function tzCityName(tz: string): string {
  return (tz.split('/').pop() ?? tz).replace(/_/g, ' ')
}
export function workingStatus(ms: number, tz: string, start = 9, end = 18): boolean {
  const d = zoned(ms, tz)
  const hour = d.hour() + d.minute() / 60
  return d.day() >= 1 && d.day() <= 5 && hour >= start && hour < end
}
function calendarDayStart(date: string, tz: string): ParseResult<number> {
  const parsed = strictUtc(date, 'YYYY-MM-DD')
  if (!parsed.isValid()) return { ok: false, error: 'parseFailed' }
  const midnight = resolveWallTime(date + ' 00:00:00', tz)
  if (midnight.ok) return { ok: true, value: midnight.value[0] }
  if (midnight.error !== 'nonexistentTime') return midnight
  // 午夜恰在缺口内时，寻找该日实际开始；完整跳过的日历日仍返回不存在。
  let ms = dayjs.tz(date + ' 00:00:00', tz).valueOf()
  if (zoned(ms, tz).format('YYYY-MM-DD') !== date) return midnight
  for (let minutes = 0; minutes < 1440; minutes++) {
    if (zoned(ms - MINUTE, tz).format('YYYY-MM-DD') !== date) break
    ms -= MINUTE
  }
  return { ok: true, value: ms }
}
export function workOverlap(date: string, referenceTz: string, zones: string[], start = 9, end = 18): ParseResult<WorkSlot[]> {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 24 || start >= end) return { ok: false, error: 'invalidWorkHours' }
  if (!zones.length) return { ok: true, value: [] }
  if (zones.some(tz => !isValidTimezone(tz))) return { ok: false, error: 'tzOrFmtInvalid' }
  const first = calendarDayStart(date, referenceTz)
  if (!first.ok) return first
  let last = calendarDayStart(strictUtc(date, 'YYYY-MM-DD').add(1, 'day').format('YYYY-MM-DD'), referenceTz)
  for (let days = 2; !last.ok && last.error === 'nonexistentTime' && days <= 3; days++) {
    last = calendarDayStart(strictUtc(date, 'YYYY-MM-DD').add(days, 'day').format('YYYY-MM-DD'), referenceTz)
  }
  if (!last.ok) return last
  const slots: WorkSlot[] = []
  const step = 15 * MINUTE
  for (let ms = first.value; ms < last.value; ms += step) {
    const endMs = Math.min(ms + step, last.value)
    if (!zones.every(tz => workingStatus(ms, tz, start, end) && workingStatus(endMs - 1, tz, start, end))) continue
    const previous = slots[slots.length - 1]
    if (previous?.end === ms) previous.end = endMs
    else slots.push({ start: ms, end: endMs })
  }
  return { ok: true, value: slots }
}
