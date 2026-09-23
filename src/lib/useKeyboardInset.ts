import { useEffect } from 'react'

/**
 * iOS Safari 上 focus 进入输入框时键盘会覆盖住 50–80% 屏幕。
 * visualViewport API 给出「视觉视口」高度；可用它把当前聚焦元素滚入可视区，
 * 并在键盘出现/收起时给出 inset 数值。
 *
 * 用法：useKeyboardInset(refOfFocusedElement)；或在表单容器上挂一次，
 *      在 onFocus 时调用返回的 scrollIntoView。
 *
 * iOS 13+/Safari 14+ 已原生支持 visualViewport；不支持时静默降级为无操作。
 *
 * 注：返回的 settleInset 用于 Sheet/Panel 容器调整底部内边距，防止
 * 键盘遮挡「提交」按钮；目前用 CSS dvh 收缩已经能避开大部分场景，
 * 这里只补滚动聚焦。
 */
export function useKeyboardInset(focusRef: React.RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const vv = window.visualViewport
    if (!vv) return
    let raf = 0
    const onResize = (): void => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = focusRef.current
        if (!el) return
        // 把聚焦元素的中点对齐到 visualViewport 中点（键盘上方）
        const rect = el.getBoundingClientRect()
        const visibleMid = vv.offsetTop + vv.height / 2
        const elMid = rect.top + rect.height / 2
        const delta = elMid - visibleMid
        if (Math.abs(delta) > 20) {
          window.scrollBy({ top: delta, behavior: 'smooth' })
        }
      })
    }
    vv.addEventListener('resize', onResize)
    return () => {
      vv.removeEventListener('resize', onResize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [focusRef])
}