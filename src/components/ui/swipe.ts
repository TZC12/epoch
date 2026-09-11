import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

const REVEAL_W = 64            /* 露出宽度（=删除钮宽） */
const HOLD_AT = -40            /* 过半即吸附露出（真机校准值） */
const GHOST_MS = 450           /* iOS 合成 click 幽灵窗 */

export const SWIPE_REVEAL_W = REVEAL_W

/**
 * 行左滑露删除（唯一手势实现；TlRow 与 Plan 收集箱行共用）。
 * 手势规则（legacy 真机三轮结论，勿回退）：
 *  1. touch-action: pan-y —— 纵滚归浏览器、横滑归 JS；
 *  2. 非被动 touchmove：横向锁定后 preventDefault（否则 iOS 纵滚抢事件 → pointercancel 半途弹回）；
 *  3. wasSwipe 时非被动 touchend preventDefault —— 掐掉 iOS 松手后的合成 click；
 *  4. justSwiped() 450ms 幽灵窗 —— 行身 click 处理器必须先查它。
 */
export function useSwipeReveal() {
  const innerRef = useRef<HTMLDivElement | null>(null)
  const [reveal, setReveal] = useState(false)
  const [dragging, setDragging] = useState(false)
  const g = useRef<{ startX: number; startY: number; locked: false | 'x' | 'y'; wasSwipe: boolean; lastDx: number }>({ startX: 0, startY: 0, locked: false, wasSwipe: false, lastDx: 0 })
  const lastSwipeEndAt = useRef(0)
  const justSwiped = (): boolean => performance.now() - lastSwipeEndAt.current < GHOST_MS

  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const onTouchMove = (e: TouchEvent): void => {
      if (g.current.locked === 'x' && e.cancelable) e.preventDefault()
    }
    const onTouchEnd = (e: TouchEvent): void => {
      if (g.current.wasSwipe && e.cancelable) e.preventDefault()
    }
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: false })
    return () => {
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  const setX = (px: number): void => {
    if (innerRef.current) innerRef.current.style.transform = `translateX(${px}px)`
  }

  const onPointerDown = (e: ReactPointerEvent): void => {
    g.current = { startX: e.clientX, startY: e.clientY, locked: false, wasSwipe: false, lastDx: 0 }
    /* 不在 down 时 setPointerCapture：捕获会把后续 click 重定向到 inner，行身按钮的
       onOpen 永远收不到（真机点开详情失效）。捕获延迟到横向锁定（确认真滑动）时。 */
  }

  const onPointerMove = (e: ReactPointerEvent): void => {
    const cur = g.current
    if (cur.locked === false) {
      const dx = e.clientX - cur.startX
      const dy = e.clientY - cur.startY
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      cur.locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (cur.locked === 'x') {
        cur.wasSwipe = true
        setDragging(true)
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* jsdom 无此 API */ }
      }
    }
    if (cur.locked !== 'x') return
    const dx = Math.min(0, Math.max(-(REVEAL_W + 8), e.clientX - cur.startX))
    cur.lastDx = dx
    setX(dx)
  }

  const onPointerEnd = (): void => {
    const cur = g.current
    if (cur.locked === 'x') {
      lastSwipeEndAt.current = performance.now()
      const revealed = cur.lastDx < HOLD_AT
      setReveal(revealed)
      setDragging(false)
      setX(revealed ? -REVEAL_W : 0)
    }
    /* wasSwipe 保留到下一次 pointerdown 才重置——touchend 在 pointerup 之后仍要用它 */
    cur.locked = false
    cur.lastDx = 0
  }

  const collapse = (): void => {
    setReveal(false)
    setX(0)
  }

  return {
    innerRef,
    reveal,
    dragging,
    justSwiped,
    collapse,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  }
}
