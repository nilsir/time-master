export const DEFAULT_TIMEZONES = [
  'Asia/Shanghai',
  'America/New_York',
  'Europe/London',
  'Asia/Tokyo',
]

export const FORMAT_PRESETS = [
  { label: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss' },
  { label: 'YYYY-MM-DDTHH:mm:ssZ (ISO)', value: 'YYYY-MM-DDTHH:mm:ssZ' },
  { label: 'YYYY/MM/DD HH:mm', value: 'YYYY/MM/DD HH:mm' },
  { label: 'MM/DD/YYYY hh:mm A', value: 'MM/DD/YYYY hh:mm A' },
  { label: 'DD MMM YYYY HH:mm', value: 'DD MMM YYYY HH:mm' },
] as const

export const DAY_START_HOUR = 6
export const NIGHT_START_HOUR = 18

export const STORAGE_KEYS = {
  selectedTimezones: 'selectedTimezones',
  timeFormat: 'timeFormat',
  theme: 'theme',
  tsUnit: 'tsUnit',
  defaultTimezone: 'defaultTimezone',
  defaultFormat: 'defaultFormat',
  language: 'language',
  windowBounds: 'windowBounds',
} as const

export const TIMEZONE_CN_ALIASES: Record<string, string[]> = {
  'Asia/Shanghai': ['上海', '北京', '中国', 'Beijing', 'Shanghai'],
  'Asia/Hong_Kong': ['香港', 'Hong Kong'],
  'Asia/Taipei': ['台北', '台湾', 'Taipei'],
  'Asia/Tokyo': ['东京', '日本', 'Tokyo'],
  'Asia/Seoul': ['首尔', '韩国', 'Seoul'],
  'Asia/Singapore': ['新加坡', 'Singapore'],
  'Asia/Bangkok': ['曼谷', '泰国', 'Bangkok'],
  'Asia/Dubai': ['迪拜', 'Dubai'],
  'Asia/Kolkata': ['加尔各答', '印度', 'Kolkata'],
  'Europe/London': ['伦敦', '英国', 'London'],
  'Europe/Paris': ['巴黎', '法国', 'Paris'],
  'Europe/Berlin': ['柏林', '德国', 'Berlin'],
  'Europe/Moscow': ['莫斯科', '俄罗斯', 'Moscow'],
  'America/New_York': ['纽约', 'New York'],
  'America/Los_Angeles': ['洛杉矶', '旧金山', 'Los Angeles', 'San Francisco'],
  'America/Chicago': ['芝加哥', 'Chicago'],
  'America/Toronto': ['多伦多', '加拿大', 'Toronto'],
  'America/Sao_Paulo': ['圣保罗', '巴西', 'Sao Paulo'],
  'Australia/Sydney': ['悉尼', '澳大利亚', 'Sydney'],
  'Australia/Melbourne': ['墨尔本', 'Melbourne'],
  'Pacific/Auckland': ['奥克兰', '新西兰', 'Auckland'],
  'Africa/Cairo': ['开罗', '埃及', 'Cairo'],
  'Africa/Johannesburg': ['约翰内斯堡', 'Johannesburg'],
  'America/Anchorage': ['安克雷奇', '阿拉斯加', 'Anchorage', 'Alaska'],
}
