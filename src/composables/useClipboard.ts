import { ref } from 'vue'

export function useClipboard(resetMs = 1200) {
  const copied = ref(false)
  let timer: number | null = null

  async function copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {
        document.body.removeChild(ta)
        return false
      }
      document.body.removeChild(ta)
    }
    copied.value = true
    if (timer !== null) clearTimeout(timer)
    timer = window.setTimeout(() => {
      copied.value = false
      timer = null
    }, resetMs)
    return true
  }

  return { copied, copy }
}
