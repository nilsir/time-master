import { computed, watchEffect } from 'vue'
import dayjs from '@/lib/dayjs'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/en'
import { useStoredValue } from './useStorage'
import { detectSystemLocale, locale, type SupportedLocale } from '@/i18n'

export function useLocale() {
  const setting = useStoredValue('language')

  const resolved = computed<SupportedLocale>(() => {
    if (setting.value === 'zh' || setting.value === 'en') return setting.value
    return detectSystemLocale()
  })

  watchEffect(() => {
    locale.value = resolved.value
    dayjs.locale(resolved.value === 'zh' ? 'zh-cn' : 'en')
    if (typeof document !== 'undefined') {
      document.documentElement.lang = resolved.value === 'zh' ? 'zh-CN' : 'en'
    }
  })

  return { setting, resolved }
}
