import { useSyncExternalStore } from 'react'

/**
 * 官方 swipeable-list 只管"怎么拖、怎么结算"，下面两条真机规则它不知道，
 * 留在我们这一层（第三条"同时只开一行"是列表级状态，见 TlRow.tsx）。
 */

/* ── 1. iOS 幽灵窗 ─────────────────────────────────────────────────
   motion 全程不 preventDefault：PanSession 的 window 监听写死
   { passive: true, capture: true }，且 framer-motion 13.4 的 dist 里
   grep 不到一处 preventDefault（已核）。所以松手后 iOS 仍会补一个合成
   click 到行身——不掐住它，左滑完就顺手打开了详情。
   GHOST_MS=450 是 legacy 真机三轮校准值，勿凭手感调。 */
const GHOST_MS = 450
let lastSwipeEndAt = 0

/** 行的 value 变化只可能发生在拖拽起手或拖拽结算时（官方 snapTo 的两个出口），
 *  所以列表只需在 onValueChange 里打这个点，不必 fork 官方去要 dragEnd。 */
export function markSwipeEnd(): void {
  lastSwipeEndAt = performance.now()
}

export function justSwiped(): boolean {
  return performance.now() - lastSwipeEndAt < GHOST_MS
}

/* ── 2. 让位给 pager ───────────────────────────────────────────────
   SegmentedPager 长按 400ms 武装后写 body.pagerLock，任意处横拖都翻卡。
   行必须立刻停手，否则一行跟着手指走、页面也在翻（旧版是在 pointermove 里查；
   官方引擎查不到，就翻转它的 drag 开关——见组件里的 F2 注释）。
   用 MutationObserver 订阅而不是在 pager 里加回调：pager 不该知道行的存在。 */
const isLocked = (): boolean => document.body.dataset.pagerLock === '1'

function subscribeLock(listener: () => void): () => void {
  const ob = new MutationObserver(listener)
  ob.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-pager-lock'],
  })
  return () => ob.disconnect()
}

export function usePagerYield(): boolean {
  return useSyncExternalStore(subscribeLock, isLocked, () => false)
}
