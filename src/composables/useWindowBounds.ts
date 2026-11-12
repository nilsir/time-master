import { onScopeDispose } from 'vue'
import type { WindowBounds } from '@/types'

// Firefox 的部分运行方式不提供 onBoundsChanged，由独立页面保存外框位置。
export function useWindowBounds() {
  if (typeof window === 'undefined') return
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let lastSaved = ''
  let disposed = false

  function snapshot(): WindowBounds | null {
    const { outerWidth: width, outerHeight: height, screenX: left, screenY: top } = window
    if (![width, height, left, top].every(Number.isFinite) || width <= 0 || height <= 0) return null
    return { width: Math.round(width), height: Math.round(height), left: Math.round(left), top: Math.round(top) }
  }

  async function persist() {
    const bounds = snapshot()
    if (disposed || !bounds || typeof chrome === 'undefined' || !chrome.storage?.local) return
    const serialized = JSON.stringify(bounds)
    if (serialized === lastSaved) return
    try {
      await chrome.storage.local.set({ windowBounds: bounds })
      lastSaved = serialized
    } catch {
      // 关闭或配额错误时保留待保存状态，下次低频检查重试。
    }
  }

  function scheduleSave() {
    if (debounceTimer !== null) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void persist()
    }, 200)
  }

  function saveImmediately() {
    if (debounceTimer !== null) clearTimeout(debounceTimer)
    debounceTimer = null
    void persist()
  }

  window.addEventListener('resize', scheduleSave)
  window.addEventListener('pagehide', saveImmediately)
  const positionTimer = setInterval(() => { void persist() }, 2000)
  scheduleSave()
  onScopeDispose(() => {
    // 组件销毁也尝试保留最终位置，之后释放全部页面资源。
    saveImmediately()
    disposed = true
    clearInterval(positionTimer)
    window.removeEventListener('resize', scheduleSave)
    window.removeEventListener('pagehide', saveImmediately)
  })
}
