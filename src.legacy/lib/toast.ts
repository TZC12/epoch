export type ToastTone = 'success' | 'error' | 'info' | 'sync'

export interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

type Listener = (items: ToastItem[]) => void

let items: ToastItem[] = []
let nextId = 1
const listeners = new Set<Listener>()
let timer: ReturnType<typeof setTimeout> | null = null

function emit() {
  for (const l of listeners) l([...items])
}

function scheduleDismiss() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    items = []
    emit()
    timer = null
  }, 1800)
}

export function toast(message: string, tone: ToastTone = 'info') {
  const item = { id: nextId++, message, tone }
  items = [...items.slice(-2), item] // 最多同时 3 条
  emit()
  scheduleDismiss()
}

export function subscribeToasts(fn: Listener): () => void {
  listeners.add(fn)
  fn([...items])
  return () => {
    listeners.delete(fn)
  }
}
