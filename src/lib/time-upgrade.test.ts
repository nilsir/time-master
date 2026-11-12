import { describe, it, expect } from 'vitest'
import { parseToTimestamp, formatTimestamp, relativeDayOffset, hourOffsetLabel, toMillis, resolveWallTime, parseTimeInput, workingStatus, workOverlap, formatMillis, utcOffsetLabel, formatIso, nowInTz } from './time'

const fmt = 'YYYY-MM-DD HH:mm:ss'
describe('严格时间转换', () => {
  it.each(['2026-02-30 12:00:00', '2026-13-01 12:00:00', '2026-11-12 25:00:00', '2026-11-12 12:00:00 trailing'])( '拒绝非法日期 %s', input => {
    expect(parseToTimestamp(input, 'Asia/Shanghai', fmt).ok).toBe(false)
  })
  it('带偏移 ISO 往返不重复应用时区', () => {
    const input = '2026-11-12T10:00:00+08:00'
    expect(parseToTimestamp(input, 'Asia/Shanghai', 'YYYY-MM-DDTHH:mm:ssZ')).toEqual({ok: true, value: Date.parse(input)})
    expect(formatTimestamp(Date.parse(input), 'Asia/Shanghai', 'YYYY-MM-DDTHH:mm:ssZ')).toEqual({ok: true, value: input})
  })
  it('显式毫秒支持接近纪元的值', () => {
    expect(toMillis('1000', 'ms')).toBe(1000)
    expect(toMillis('1000', 's')).toBe(1000000)
    expect(formatMillis(1000, 'UTC', fmt)).toEqual({ok: true, value: '1970-01-01 00:00:01'})
  })
  it('拒绝日期范围和安全整数溢出', () => {
    expect(toMillis('8640000000000001', 'ms')).toBeNull()
    expect(toMillis('9007199254740993', 's')).toBeNull()
  })
  it('纽约昨天与上海今天按日期比较', () => {
    expect(relativeDayOffset(Date.parse('2026-11-12T00:00:00Z'), 'America/New_York', 'Asia/Shanghai')).toBe(-1)
  })
  it('保留半小时和四十五分钟时差', () => {
    const ms = Date.parse('2026-11-12T00:00:00Z')
    expect(hourOffsetLabel(ms, 'Asia/Kolkata', 'Asia/Shanghai')).toBe('−2:30')
    expect(hourOffsetLabel(ms, 'Asia/Kathmandu', 'Asia/Shanghai')).toBe('−2:15')
  })
  it('无效时区返回错误', () => {
    expect(resolveWallTime('2026-11-12 12:00:00', 'invalid/zone', fmt).ok).toBe(false)
  })
})
describe('统一识别与夏令时', () => {
  it.each(['1794448800', '1794448800000', '2026-11-12T10:00:00+08:00', '2026-11-12 10:00:00'])( '识别 %s', input => {
    const result = parseTimeInput(input, 'Asia/Shanghai', fmt, 'auto')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.ms).toBe(1794448800000)
  })
  it('识别带毫秒和 Z 的 ISO', () => {
    const result = parseTimeInput('2026-11-12T02:00:00.123Z', 'Asia/Shanghai', fmt)
    expect(result.ok && result.value.ms).toBe(1794448800123)
  })
  it('ISO 不接受溢出日期或非法偏移', () => {
    expect(parseTimeInput('2026-02-30T02:00:00Z', 'UTC', fmt).ok).toBe(false)
    expect(parseTimeInput('2026-11-12T02:00:00+25:00', 'UTC', fmt).ok).toBe(false)
  })
  it('不存在的纽约当地时间报错', () => {
    expect(resolveWallTime('2026-03-08 02:30:00', 'America/New_York', fmt)).toEqual({ok:false, error:'nonexistentTime'})
  })
  it('重复时间返回两个按时间先后排序的候选', () => {
    expect(resolveWallTime('2026-11-01 01:30:00', 'America/New_York', fmt)).toEqual({ok:true, value:[Date.parse('2026-11-01T05:30:00Z'), Date.parse('2026-11-01T06:30:00Z')]})
  })
  it('半小时夏令时缺口同样报错', () => {
    expect(resolveWallTime('2026-10-04 02:15:00', 'Australia/Lord_Howe', fmt)).toEqual({ok:false,error:'nonexistentTime'})
  })
})
describe('工作时间规划', () => {
  it('工作日包含9点不包含18点，周末非工作', () => {
    expect(workingStatus(Date.parse('2026-11-12T09:00:00Z'), 'UTC', 9, 18)).toBe(true)
    expect(workingStatus(Date.parse('2026-11-12T18:00:00Z'), 'UTC', 9, 18)).toBe(false)
    expect(workingStatus(Date.parse('2026-11-14T10:00:00Z'), 'UTC', 9, 18)).toBe(false)
  })
  it('上海东京共同工作时间为上海09至17点', () => {
    expect(workOverlap('2026-11-12','Asia/Shanghai',['Asia/Shanghai','Asia/Tokyo'],9,18)).toEqual({ok:true,value:[{start:Date.parse('2026-11-12T01:00:00Z'),end:Date.parse('2026-11-12T09:00:00Z')}]})
  })
  it('纽约上海常规工作时间无重叠', () => {
    expect(workOverlap('2026-11-12','Asia/Shanghai',['Asia/Shanghai','America/New_York'],9,18)).toEqual({ok:true,value:[]})
  })
  it('拒绝反向工作时间并且空列表无重叠', () => {
    expect(workOverlap('2026-11-12','UTC',['UTC'],18,9).ok).toBe(false)
    expect(workOverlap('2026-11-12','UTC',[],9,18)).toEqual({ok:true,value:[]})
  })
})

describe('参考日的夏令时日界', () => {
  it.each(['2026-09-05', '2026-09-06'])('午夜跳过不影响合法参考日 %s', date => {
    expect(workOverlap(date, 'America/Santiago', ['UTC'], 0, 24).ok).toBe(true)
  })
  it('23小时的纽约参考日按实际日界结束', () => {
    expect(workOverlap('2026-03-08', 'America/New_York', ['UTC'], 0, 24)).toEqual({ok:true,value:[{start:Date.parse('2026-03-09T00:00:00Z'),end:Date.parse('2026-03-09T04:00:00Z')}]})
  })
  it('25小时的纽约参考日按实际日界结束', () => {
    expect(workOverlap('2026-11-01', 'America/New_York', ['UTC'], 0, 24)).toEqual({ok:true,value:[{start:Date.parse('2026-11-02T00:00:00Z'),end:Date.parse('2026-11-02T05:00:00Z')}]})
  })
  it('跳过整个日历日时返回不存在时间', () => {
    expect(workOverlap('2011-12-30', 'Pacific/Apia', ['UTC'], 0, 24)).toEqual({ok:false,error:'nonexistentTime'})
  })
})

describe('自定义格式偏移', () => {
  it.each([
    ['YYYY-MM-DD HH:mm:ssZ [end]', '2026-11-12 10:00:00+08:00 end'],
    ['Z YYYY-MM-DD HH:mm:ss', '+08:00 2026-11-12 10:00:00'],
    ['YYYY-MM-DD HH:mm:ssZZ [end]', '2026-11-12 10:00:00+0800 end'],
  ])('偏移令牌可位于格式任意位置 %s', (format, input) => {
    expect(parseToTimestamp(input,'America/New_York',format)).toEqual({ok:true,value:Date.parse('2026-11-12T02:00:00Z')})
  })
})

describe('负数毫秒精度', () => {
  it.each([-1, -1001])('负毫秒 %s 保持正确时区偏移', ms => {
    expect(utcOffsetLabel(ms, 'America/New_York')).toBe('UTC−5')
    expect(utcOffsetLabel(ms, 'Asia/Shanghai')).toBe('UTC+8')
    const output = formatMillis(ms, 'UTC', 'YYYY-MM-DD HH:mm:ss.SSS Z')
    expect(output.ok && output.value.endsWith('+00:00')).toBe(true)
    const shanghai = formatMillis(ms, 'Asia/Shanghai', 'YYYY-MM-DD HH:mm:ss.SSSZ')
    expect(shanghai.ok).toBe(true)
    if (shanghai.ok) expect(parseToTimestamp(shanghai.value, 'UTC', 'YYYY-MM-DD HH:mm:ss.SSSZ')).toEqual({ok:true,value:ms})
  })
})

describe('扩展年份输出', () => {
  it('公元99年不应变成1999年', () => {
    expect(formatMillis(-59042995200000, 'UTC', 'YYYY-MM-DD HH:mm:ss')).toEqual({ok:true,value:'0099-01-01 00:00:00'})
  })
})

describe('扩展年份与带毫秒的纪元前日期往返', () => {
  it.each([-59042995200000, 253402300800000])('ISO 原生扩展年份 %s 可复制并重新识别', ms => {
    const iso = formatIso(ms)
    expect(iso.ok).toBe(true)
    if (iso.ok) {
      expect(iso.value).toBe(new Date(ms).toISOString())
      const parsed = parseTimeInput(iso.value, 'UTC')
      expect(parsed.ok && parsed.value.ms).toBe(ms)
    }
  })
  it('1969年的合法毫秒当地时间正常解析', () => {
    expect(parseToTimestamp('1969-06-01 12:30:10.500','UTC','YYYY-MM-DD HH:mm:ss.SSS')).toEqual({ok:true,value:Date.parse('1969-06-01T12:30:10.500Z')})
  })
  it('公元99年的当地时间保持年份', () => {
    expect(parseToTimestamp('0099-01-01 00:00:00','UTC', 'YYYY-MM-DD HH:mm:ss')).toEqual({ok:true,value:-59042995200000})
  })
})

describe('公元零年的闰日', () => {
  it('无偏移的格式化输入与 ISO 使用相同的闰年规则', () => {
    const expected = Date.parse('0000-02-29T12:00:00.000Z')
    expect(parseToTimestamp('0000-02-29 12:00:00','UTC', 'YYYY-MM-DD HH:mm:ss')).toEqual({ok:true,value:expected})
    const iso = parseTimeInput('0000-02-29T12:00:00','UTC')
    expect(iso.ok && iso.value.ms).toBe(expected)
  })
})

describe('宿主夏令时不干扰目标时区', () => {
  it.each([
    ['2026-03-08T05:30:00Z','2026-03-08 13:30:00 +08:00'],
    ['2026-11-01T04:30:00Z','2026-11-01 12:30:00 +08:00'],
  ])('目标钟面 %s', (iso, expected) => {
    const ms = Date.parse(iso)
    expect(formatMillis(ms, 'Asia/Shanghai', 'YYYY-MM-DD HH:mm:ss Z')).toEqual({ok:true,value:expected})
    expect(nowInTz(ms,'Asia/Shanghai').valueOf()).toBe(ms)
  })
})
