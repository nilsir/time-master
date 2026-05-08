import { ref, onScopeDispose } from 'vue'

const now = ref(Date.now())
const paused = ref(false)
let timer: number | null = null
let subscribers = 0

function start() {
  if (timer !== null) return
  const tick = () => {
    if (!paused.value) now.value = Date.now()
    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000))
  }
  tick()
}

function stop() {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
}

export function useNow() {
  subscribers++
  start()
  onScopeDispose(() => {
    subscribers--
    if (subscribers <= 0) stop()
  })
  return { now, paused }
}

export function pauseNow() {
  paused.value = true
}
export function resumeNow() {
  paused.value = false
  now.value = Date.now()
}
export function togglePause() {
  paused.value ? resumeNow() : pauseNow()
}
