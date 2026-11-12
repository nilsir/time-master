import { describe, it, expect } from 'vitest'
import { getTimezoneList, matchesTimezone } from './useTimezones'
describe('时区选择', () => {
  it('包含 UTC 和中文印度别名', () => {
    const list = getTimezoneList(Date.parse('2026-11-12T00:00:00Z'))
    expect(list.some(x => x.tz === 'UTC')).toBe(true)
    expect(list.some(x => x.haystack.includes('印度'))).toBe(true)
  })
  it('偏移搜索精确到分钟，不把 +5:30 包含在 +5', () => {
    const list = getTimezoneList()
    const india = list.find(x => x.offsetMinutes === 330)!
    expect(matchesTimezone(india, '+5')).toBe(false)
    expect(matchesTimezone(india, '+5:30')).toBe(true)
    expect(matchesTimezone(india, 'utc+05:30')).toBe(true)
  })
  it('按选定日期刷新纽约夏令时偏移', () => {
    const winter = getTimezoneList(Date.parse('2026-01-01T00:00:00Z')).find(x => x.tz === 'America/New_York')!
    const summer = getTimezoneList(Date.parse('2026-07-01T00:00:00Z')).find(x => x.tz === 'America/New_York')!
    expect(winter.offsetMinutes).toBe(-300)
    expect(summer.offsetMinutes).toBe(-240)
  })
})
