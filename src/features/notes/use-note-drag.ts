import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 备忘卡片的"长按 → 拖拽 → 叠到别的卡上成组"手势。
 *
 * 三条从本项目既有手势件里带出来的硬规矩，改这里之前先读：
 *  1. 长按没到点就被移动打断 → 那是滚动/点击，不是拖拽（HOLD 期间位移超过 MOVE_TOL 就缴械）；
 *  2. 起拖后必须用**非被动** touchmove 调 preventDefault 才能拦住页面跟着滚——
 *     React 合成事件是被动的，preventDefault 在那里是空操作（官方 wheel-picker 同此理由）；
 *  3. 浏览器一旦接管手势会发 pointercancel，此时必须干净收尾，卡片不能停在半空。
 *
 * 落点判定只用"指针落在目标矩形内"，不用矩形相交面积：拖拽中跟手的只有指针一个坐标，
 * 面积相交要算幽灵卡的矩形，多算一份且手感反而更飘。
 */
export const HOLD_MS = 380
export const MOVE_TOL = 10

export interface RectLike { left: number; top: number; right: number; bottom: number }

export interface DropTarget {
  id: string
  kind: 'note' | 'folder'
  rect: RectLike
}

/** 指针命中：落在矩形内即候选，多个命中取面积最小者（更具体的容器优先）。 */
export function pickTarget(x: number, y: number, targets: DropTarget[], exceptId?: string): string | null {
  let best: string | null = null
  let bestArea = Infinity
  for (const t of targets) {
    if (t.id === exceptId) continue
    if (x < t.rect.left || x > t.rect.right || y < t.rect.top || y > t.rect.bottom) continue
    const area = (t.rect.right - t.rect.left) * (t.rect.bottom - t.rect.top)
    if (area < bestArea) { bestArea = area; best = t.id }
  }
  return best
}

/** 安全区夹取：拖拽中的卡片不许被塞进顶部工具区或底部导航之下。 */
export function clampToSafe(v: number, min: number, max: number): number {
  return max < min ? min : Math.min(Math.max(v, min), max)
}

export interface DragState {
  id: string
  /** 跟手位移（transform: translate 用，不动布局） */
  dx: number
  dy: number
  /** 当前悬停在哪个落点上（高亮用） */
  over: string | null
}

export interface UseNoteDragArgs {
  /** 每次命中测试前现取最新矩形（滚动/重排后坐标会变，不能缓存） */
  collect: () => DropTarget[]
  /** 松手：targetId=null 表示落在空白处，只回弹 */
  onDrop: (draggedId: string, targetId: string | null) => void
  /** 安全区上下边界（视口坐标） */
  safeTop: () => number
  safeBottom: () => number
  disabled?: boolean
}

export function useNoteDrag({ collect, onDrop, safeTop, safeBottom, disabled = false }: UseNoteDragArgs) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const [armedId, setArmedId] = useState<string | null>(null)
  const session = useRef<{
    id: string; x0: number; y0: number; timer: ReturnType<typeof setTimeout> | null
    active: boolean
  } | null>(null)
  const raf = useRef(0)
  const latest = useRef({ x: 0, y: 0 })
  const dropRef = useRef(onDrop)
  dropRef.current = onDrop
  const collectRef = useRef(collect)
  collectRef.current = collect
  const safeRef = useRef({ top: safeTop, bottom: safeBottom })
  safeRef.current = { top: safeTop, bottom: safeBottom }

  const end = useCallback((commit: boolean) => {
    const s = session.current
    if (raf.current) { cancelAnimationFrame(raf.current); raf.current = 0 }
    if (s?.timer) clearTimeout(s.timer)
    if (s?.active && commit) {
      const over = pickTarget(latest.current.x, latest.current.y, collectRef.current(), s.id)
      dropRef.current(s.id, over)
    }
    session.current = null
    setArmedId(null)
    setDrag(null)
  }, [])

  /* 起拖后拦页面滚动：非被动监听，只在拖拽存续期间挂上 */
  useEffect(() => {
    if (!armedId) return
    const block = (e: TouchEvent) => { if (e.cancelable) e.preventDefault() }
    window.addEventListener('touchmove', block, { passive: false })
    return () => window.removeEventListener('touchmove', block)
  }, [armedId])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const s = session.current
      if (!s) return
      latest.current = { x: e.clientX, y: e.clientY }
      if (!s.active) {
        if (Math.hypot(e.clientX - s.x0, e.clientY - s.y0) > MOVE_TOL) {
          /* 还没长按到位就先动了 → 是滚动/误触，缴械，别跟系统抢手势 */
          if (s.timer) clearTimeout(s.timer)
          s.timer = null
          session.current = null
        }
        return
      }
      if (raf.current) return
      raf.current = requestAnimationFrame(() => {
        raf.current = 0
        const cur = session.current
        if (!cur?.active) return
        const top = safeRef.current.top()
        const bottom = safeRef.current.bottom()
        const dx = e.clientX - cur.x0
        const dy = clampToSafe(e.clientY - cur.y0, top - cur.y0, bottom - cur.y0)
        setDrag({ id: cur.id, dx, dy, over: pickTarget(e.clientX, e.clientY, collectRef.current(), cur.id) })
      })
    }
    const onUp = () => end(true)
    const onCancel = () => end(false)     // 系统接管：干净回位，不提交合并
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
  }, [end])

  /** 挂到卡片的 onPointerDown 上；返回 true 表示这次按压已进入长按流程（点击要让它） */
  const begin = useCallback((e: React.PointerEvent<HTMLElement>, id: string): void => {
    if (disabled || e.button > 0) return
    if (session.current) return
    latest.current = { x: e.clientX, y: e.clientY }
    const s = { id, x0: e.clientX, y0: e.clientY, timer: null as ReturnType<typeof setTimeout> | null, active: false }
    session.current = s
    s.timer = setTimeout(() => {
      if (session.current !== s) return
      s.active = true
      s.timer = null
      setArmedId(id)
      setDrag({ id, dx: 0, dy: 0, over: null })
      if (typeof navigator.vibrate === 'function') navigator.vibrate(8)   // 起拖确认（不支持则静默）
    }, HOLD_MS)
  }, [disabled])

  return { drag, armedId, begin, cancel: () => end(false) }
}
