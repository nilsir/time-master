import { computed, ref, watchEffect } from 'vue'
import { useStoredValue } from './useStorage'

const systemDark = ref(false)
let mqlInited = false
function initSystemListener() {
  if (mqlInited) return
  if (typeof window === 'undefined') return
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  systemDark.value = mql.matches
  mql.addEventListener('change', (e) => {
    systemDark.value = e.matches
  })
  mqlInited = true
}

export function useTheme() {
  initSystemListener()
  const theme = useStoredValue('theme')

  const resolved = computed<'light' | 'dark'>(() => {
    if (theme.value === 'light') return 'light'
    if (theme.value === 'dark') return 'dark'
    return systemDark.value ? 'dark' : 'light'
  })

  watchEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.theme = resolved.value
  })

  return { theme, resolved }
}
