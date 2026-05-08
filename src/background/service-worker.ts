const STANDALONE_URL = 'src/standalone/index.html'
const BOUNDS_KEY = 'windowBounds'
const STATE_KEY = 'standaloneWindowId'
const DEFAULT_BOUNDS = { width: 380, height: 560 }

interface Bounds {
  width: number
  height: number
  left?: number
  top?: number
}

async function getBounds(): Promise<Bounds> {
  const r = await chrome.storage.local.get([BOUNDS_KEY])
  const b = r[BOUNDS_KEY] as Partial<Bounds> | undefined
  return {
    width: b?.width ?? DEFAULT_BOUNDS.width,
    height: b?.height ?? DEFAULT_BOUNDS.height,
    left: b?.left,
    top: b?.top,
  }
}

async function saveBounds(b: Bounds) {
  await chrome.storage.local.set({ [BOUNDS_KEY]: b })
}

async function getRememberedWindowId(): Promise<number | null> {
  const r = await chrome.storage.session.get([STATE_KEY])
  return (r[STATE_KEY] as number | undefined) ?? null
}
async function setRememberedWindowId(id: number | null) {
  if (id === null) await chrome.storage.session.remove(STATE_KEY)
  else await chrome.storage.session.set({ [STATE_KEY]: id })
}

async function focusOrCreateStandalone() {
  const id = await getRememberedWindowId()
  if (id !== null) {
    try {
      const w = await chrome.windows.get(id)
      if (w) {
        await chrome.windows.update(id, { focused: true, drawAttention: true })
        return
      }
    } catch {
      // not found, fall through
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
    await setRememberedWindowId(created.id)
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'OPEN_STANDALONE') {
    focusOrCreateStandalone()
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }))
    return true
  }
  return false
})

chrome.windows.onRemoved.addListener(async (windowId) => {
  const id = await getRememberedWindowId()
  if (id === windowId) await setRememberedWindowId(null)
})

chrome.windows.onBoundsChanged?.addListener(async (window) => {
  const id = await getRememberedWindowId()
  if (id !== window.id) return
  if (
    window.width === undefined ||
    window.height === undefined ||
    window.state === 'minimized'
  ) {
    return
  }
  await saveBounds({
    width: window.width,
    height: window.height,
    left: window.left,
    top: window.top,
  })
})
