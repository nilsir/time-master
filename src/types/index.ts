export type ThemeMode = 'system' | 'light' | 'dark'
export type TimeFormat = '12h' | '24h'
export type TsUnitMode = 'auto' | 's' | 'ms'

export interface UserSettings {
  selectedTimezones: string[]
  timeFormat: TimeFormat
  theme: ThemeMode
  tsUnit: TsUnitMode
  defaultTimezone: string
  defaultFormat: string
}

export interface WindowBounds {
  width: number
  height: number
  left?: number
  top?: number
}
