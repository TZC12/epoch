import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './toast.css'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastItem {
  id: number
  tone: ToastTone
  message: string
  action?: ToastAction
}

interface ToastApi {
  toast: (message: string, opts?: { tone?: ToastTone; action?: ToastAction }) => void
}

const ToastCtx = createContext<ToastApi>({ toast: () => {} })

const CLOSE_MS = 250 /* 与 toast.css --stack-close 同值：落完才卸载 */
const MAX_STACK = 3  /* 第 4 条进来时最老的一条被"挤出台阶" */

/**
 * 单条 banner。堆叠机制取自 Transitions.dev「Banner stacking」（Sonner 式）：
 * 新条从下方 60px 浮起到 depth 0，旧条逐级退后（上移 peek + 缩小 + 变淡 + 模糊），
 * 悬停整列展开成可分别点击的堆，第 4 条到达时最老一条 is-leaving 退场。
 * tone 只作调用方语义，不再渲染彩色左条——弹窗除玻璃卡本身不允许有多余颜色。
 */
function ToastCard({ item, depth, onGone, onSpread, onHoverCheck }: {
  item: ToastItem; depth: number; onGone: (id: number) => void
  onSpread: () => void; onHoverCheck: (e: React.PointerEvent) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [entered, setEntered] = useState(false)
  const [exiting, setExiting] = useState(false)
  const left = useRef(false)
  const evicted = depth >= MAX_STACK /* 被新来的挤下台阶：不是用户 dismissal，走 is-leaving */

  useEffect(() => {
    if (evicted) return
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [evicted])

  /* 被挤出台阶的：is-leaving 动画走完就卸载 */
  useEffect(() => {
    if (!evicted) return
    const t = window.setTimeout(() => onGone(item.id), CLOSE_MS + 20)
    return () => window.clearTimeout(t)
  }, [evicted, item.id, onGone])

  const leave = useCallback((): void => {
    if (left.current || evicted) return
    left.current = true
    setExiting(true)
    window.setTimeout(() => onGone(item.id), CLOSE_MS + 20)
  }, [evicted, item.id, onGone])

  useEffect(() => {
    if (evicted) return
    const t = window.setTimeout(leave, (item.action ? 4200 : 2600) + 50)
    return () => window.clearTimeout(t)
  }, [evicted, item.action, leave])

  const cls = ['toast']
  if (!entered && !evicted) cls.push('is-enter')
  if (evicted) cls.push('is-leaving')
  if (exiting) cls.push('is-exit')

  return (
    <div
      ref={ref}
      className={cls.join(' ')}
      data-depth={Math.min(depth, 2)}
      onPointerEnter={onSpread}
      onPointerLeave={onHoverCheck}
    >
      <span className="toast__msg">{item.message}</span>
      {item.action && !evicted && !exiting && (
        <button
          type="button"
          className="toast__act"
          onClick={() => { item.action!.onClick(); leave() }}
        >
          {item.action.label}
        </button>
      )}
    </div>
  )
}

/** 全局 toast：Sonner 式堆叠（≤3 可见）。role=status aria-live=polite。 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const [spread, setSpread] = useState(false)
  const seq = useRef(0)
  const regionRef = useRef<HTMLDivElement>(null)

  const onGone = useCallback((id: number) => setItems((xs) => xs.filter((t) => t.id !== id)), [])

  const toast = useCallback<ToastApi['toast']>((message, opts = {}) => {
    const id = ++seq.current
    setItems((xs) => [...xs.slice(-(MAX_STACK * 2)), { id, tone: opts.tone ?? 'info', message, action: opts.action }])
  }, [])

  const api = useMemo(() => ({ toast }), [toast])

  /* 展开保持：指针落在堆间隙（不属于任何 banner）时不收，直到离开整个展开盒 */
  const onHoverCheck = useCallback((e: React.PointerEvent) => {
    const box = regionRef.current?.getBoundingClientRect()
    if (!box) return
    const { clientX: x, clientY: y } = e
    if (x < box.left || x > box.right || y < box.top || y > box.bottom) setSpread(false)
  }, [])

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {createPortal(
        <div ref={regionRef} className={`toast-region${spread ? ' is-spread' : ''}`} role="status" aria-live="polite">
          {items.map((t, i) => (
            <ToastCard
              key={t.id}
              item={t}
              depth={items.length - 1 - i}
              onGone={onGone}
              onSpread={() => setSpread(true)}
              onHoverCheck={onHoverCheck}
            />
          ))}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
