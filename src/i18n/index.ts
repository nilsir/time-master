import { ref, type Ref } from 'vue'
import enMessages from '@/locales/en.json'
import zhMessages from '@/locales/zh.json'

export type SupportedLocale = 'en' | 'zh'
export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'zh']

const messages: Record<SupportedLocale, unknown> = {
  en: enMessages,
  zh: zhMessages,
}

export const locale: Ref<SupportedLocale> = ref('en')

function resolvePath(obj: unknown, path: string): unknown {
  let cur: unknown = obj
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

const INTERPOLATE = /\{(\w+)\}/g

export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  const value = resolvePath(messages[locale.value], key)
  if (typeof value !== 'string') return key
  if (!params) return value
  return value.replace(INTERPOLATE, (_match, name: string) =>
    name in params ? String(params[name]) : `{${name}}`,
  )
}

export function detectSystemLocale(): SupportedLocale {
  const lang = (
    typeof navigator !== 'undefined' ? navigator.language : 'en'
  ).toLowerCase()
  return lang.startsWith('zh') ? 'zh' : 'en'
}
