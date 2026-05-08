import { describe, expect, it } from 'vitest'
import {
  detectTsUnit,
  formatTimestamp,
  parseToTimestamp,
  toMillis,
  isDaytime,
  utcOffsetLabel,
} from './time'

describe('detectTsUnit', () => {
  it('detects 10-digit as seconds', () => {
    expect(detectTsUnit(1746701400)).toBe('s')
  })
  it('detects 13-digit as milliseconds', () => {
    expect(detectTsUnit(1746701400123)).toBe('ms')
  })
  it('rejects garbage', () => {
    expect(detectTsUnit('abc')).toBe('invalid')
    expect(detectTsUnit('')).toBe('invalid')
    expect(detectTsUnit('12.3')).toBe('invalid')
  })
})

describe('toMillis', () => {
  it('promotes seconds to ms', () => {
    expect(toMillis(1746701400)).toBe(1746701400000)
  })
  it('keeps ms', () => {
    expect(toMillis(1746701400123)).toBe(1746701400123)
  })
  it('returns null for invalid', () => {
    expect(toMillis('xyz')).toBeNull()
  })
})

describe('formatTimestamp', () => {
  it('formats UTC time in Asia/Shanghai', () => {
    const r = formatTimestamp(0, 'Asia/Shanghai', 'YYYY-MM-DD HH:mm:ss')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe('1970-01-01 08:00:00')
  })
  it('returns invalidTs error key for garbage input', () => {
    const r = formatTimestamp('abc', 'Asia/Shanghai', 'YYYY-MM-DD')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('invalidTs')
  })
})

describe('parseToTimestamp', () => {
  it('parses Shanghai 1970-01-01 08:00:00 to 0', () => {
    const r = parseToTimestamp(
      '1970-01-01 08:00:00',
      'Asia/Shanghai',
      'YYYY-MM-DD HH:mm:ss',
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(0)
  })
  it('round-trips a recent time', () => {
    const fmt = 'YYYY-MM-DD HH:mm:ss'
    const tz = 'America/New_York'
    const f = formatTimestamp(1714579200000, tz, fmt)
    expect(f.ok).toBe(true)
    if (f.ok) {
      const p = parseToTimestamp(f.value, tz, fmt)
      expect(p.ok).toBe(true)
      if (p.ok) expect(p.value).toBe(1714579200000)
    }
  })
  it('returns inputRequired error key on empty input', () => {
    const r = parseToTimestamp('', 'UTC', 'YYYY-MM-DD')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('inputRequired')
  })
  it('returns parseFailed error key on garbage', () => {
    const r = parseToTimestamp('not a date', 'UTC', 'YYYY-MM-DD HH:mm:ss')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('parseFailed')
  })
})

describe('isDaytime', () => {
  it('marks 08:00 in Shanghai as day', () => {
    const ts = parseToTimestamp(
      '2025-06-15 08:00:00',
      'Asia/Shanghai',
      'YYYY-MM-DD HH:mm:ss',
    )
    expect(ts.ok).toBe(true)
    if (ts.ok) expect(isDaytime(ts.value, 'Asia/Shanghai')).toBe(true)
  })
  it('marks 23:00 in Shanghai as night', () => {
    const ts = parseToTimestamp(
      '2025-06-15 23:00:00',
      'Asia/Shanghai',
      'YYYY-MM-DD HH:mm:ss',
    )
    expect(ts.ok).toBe(true)
    if (ts.ok) expect(isDaytime(ts.value, 'Asia/Shanghai')).toBe(false)
  })
})

describe('utcOffsetLabel', () => {
  it('formats positive offset', () => {
    const now = Date.now()
    expect(utcOffsetLabel(now, 'Asia/Shanghai')).toBe('UTC+8')
  })
  it('formats UTC', () => {
    const now = Date.now()
    expect(utcOffsetLabel(now, 'UTC')).toBe('UTC+0')
  })
})
