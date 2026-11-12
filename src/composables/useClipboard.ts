import { getCurrentScope, onScopeDispose, ref } from 'vue'

export function useClipboard(resetMs = 1200) {
  const copied = ref(false)
  const failed = ref(false)
  let timer: number | null = null
  let disposed = false
  let attempt = 0

  function clearTimer() {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  if (getCurrentScope()) onScopeDispose(() => {
    disposed = true
    attempt++
    clearTimer()
  })

  async function copy(text: string): Promise<boolean> {
    if (disposed) return false
    const currentAttempt = ++attempt
    clearTimer()
    copied.value = false
    failed.value = false
    let success = false
    try {
      await navigator.clipboard.writeText(text)
      success = true
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        success = document.execCommand('copy')
      } catch {
        success = false
      } finally {
        document.body.removeChild(ta)
      }
    }
    if (disposed || currentAttempt !== attempt) return success
    copied.value = success
    failed.value = !success
    timer = window.setTimeout(() => {
      copied.value = false
      failed.value = false
      timer = null
    }, resetMs)
    return success
  }

  return { copied, failed, copy }
}
