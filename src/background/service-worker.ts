const STANDALONE_URL = 'src/standalone/index.html'
const BOUNDS_KEY = 'windowBounds'
const STATE_KEY = 'standaloneWindowId'
const DEFAULT_BOUNDS = { width: 380, height: 560 }
let opening: Promise<void> | null = null
let rememberedWindowId: number | null = null

interface Bounds {
  width: number
  height: number
  left?: number
  top?: number
}

async function getBounds(): Promise<Bounds> {
  try {
    const r = await chrome.storage.local.get([BOUNDS_KEY])
    return normalizeBounds(r[BOUNDS_KEY])
  } catch {
    return { ...DEFAULT_BOUNDS }
  }
}

function normalizeBounds(value: unknown): Bounds {
  const b = value && typeof value === 'object' ? value as Partial<Bounds> : {}
  const dimension = (value: unknown, fallback: number, min: number, max: number) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.max(min, Math.min(max, Math.round(value)))
      : fallback
  const coordinate = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 16384
      ? Math.round(value)
      : undefined
  return {
    width: dimension(b.width, DEFAULT_BOUNDS.width, 320, 2560),
    height: dimension(b.height, DEFAULT_BOUNDS.height, 360, 1600),
    left: coordinate(b.left),
    top: coordinate(b.top),
  }
}

async function saveBounds(b: Bounds) {
  await chrome.storage.local.set({ [BOUNDS_KEY]: b })
}

async function getRememberedWindowId(): Promise<number | null> {
  if (rememberedWindowId !== null) return rememberedWindowId
  const r = await chrome.storage.local.get([STATE_KEY])
  const id = r[STATE_KEY]
  return typeof id === 'number' && Number.isInteger(id) && id >= 0 ? id : null
}
async function setRememberedWindowId(id: number | null) {
  rememberedWindowId = id
  if (id === null) await chrome.storage.local.remove(STATE_KEY)
  else await chrome.storage.local.set({ [STATE_KEY]: id })
}

async function focusOrCreateStandalone() {
  if (!chrome.windows?.create) throw new Error('此浏览器不支持独立窗口')
  const id = await getRememberedWindowId()
  if (id !== null) {
    try {
      const w = await chrome.windows.get(id)
      if (w) {
        await chrome.windows.update(id, { focused: true, drawAttention: true })
        return
      }
    } catch {
      // 原窗口已关闭，继续创建。
    }
  }
  const bounds = await getBounds()
  const created = await chrome.windows.create({
    url: chrome.runtime.getURL(STANDALONE_URL),
    type: 'popup',
    width: bounds.width,
    height: bounds.height,
    left: bounds.left,
    top: bounds.top,
    focused: true,
  })
  if (created?.id !== undefined) {
    // 即使保存失败，当前后台生命周期内仍记住已创建窗口，避免重复创建。
    await setRememberedWindowId(created.id).catch(() => {})
  }
}

function openStandalone() {
  if (!opening) {
    opening = focusOrCreateStandalone().finally(() => { opening = null })
  }
  return opening
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'OPEN_STANDALONE') {
    openStandalone()
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }))
    return true
  }
  return false
})

chrome.windows?.onRemoved?.addListener((windowId) => {
  void (async () => {
    const id = await getRememberedWindowId()
    if (id === windowId) await setRememberedWindowId(null)
  })().catch(() => {})
})

chrome.windows?.onBoundsChanged?.addListener((window) => {
  void saveWindowBounds(window).catch(() => {})
})

async function saveWindowBounds(window: chrome.windows.Window) {
  const id = await getRememberedWindowId()
  if (id !== window.id) return
  if (
    window.width === undefined ||
    window.height === undefined ||
    window.state === 'minimized'
  ) {
    return
  }
  await saveBounds(normalizeBounds({
    width: window.width,
    height: window.height,
    left: window.left,
    top: window.top,
  }))
}

export {}
