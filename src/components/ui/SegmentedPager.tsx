import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import './segmented-pager.css'

export interface PagerTab {
  key: string
  label: string
  content: ReactNode
}

const ARM_DX = 10          /* 横向启动阈值 */
const LONG_PRESS_MS = 400  /* 长按武装：任意处（含行上）横拖翻卡 */

/**
 * Segmented Control + Swipeable Pager（§四/§十二）：
 *  - Tap 上方选择切换；横滑（空白区起点）跟手翻卡；长按 400ms 后任意处横拖翻卡；
 *  - 指示 pill 与内容 track 由同一 --pager-x 变量驱动（拖拽期实时同步，无瞬切）；
 *  - 仲裁：表单控件/按钮起点不接管；行内起点默认归行左滑，长按武装后归 pager（pagerLock）；
 *  - 武装后 move/up 监听挂 window（指针离开内容区不冻结手势）。
 */
export function SegmentedPager({ tabs, ariaLabel, initial = 0 }: { tabs: PagerTab[]; ariaLabel: string; initial?: number }) {
  const [index, setIndex] = useState(initial)
  const rootRef = useRef<HTMLDivElement>(null)
  const idxRef = useRef(index)
  idxRef.current = index
  const g = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    dx: 0,
    armed: false,
    fromRow: false,
    longPress: null as number | null,
    lastX: 0, lastT: 0, vel: 0,
  })

  const width = (): number => rootRef.current?.clientWidth || 1
  const setX = (v: number, snap = false): void => {
    const root = rootRef.current
    if (!root) return
    root.style.setProperty('--pager-x', String(v))
    root.classList.toggle('is-snapping', snap)
  }
  const arm = (): void => {
    document.body.dataset.pagerLock = '1'   /* 行左滑让位 */
    g.current.armed = true
  }
  const detach = (): void => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
  }
  const cleanup = (): void => {
    detach()
    if (g.current.longPress !== null) {
      window.clearTimeout(g.current.longPress)
      g.current.longPress = null
    }
    delete document.body.dataset.pagerLock
    g.current.pointerId = -1
    g.current.armed = false
  }

  // 组件卸载兜底：手势中途卸载（路由切换/父级 re-mount）仍会泄漏 timer + window listener。
  // 依赖数组刻意为空——这是 unmount-only 效果；cleanup 每次渲染都是新函数，
  // 放进 deps 会让它每渲染都跑一次，反而失去"只在卸载时兜底"的语义。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => cleanup(), [])

  function onMove(e: PointerEvent): void {
    const s = g.current
    if (s.pointerId !== e.pointerId) return
    s.dx = e.clientX - s.startX
    const now = performance.now()
    s.vel = s.vel * 0.7 + ((e.clientX - s.lastX) / Math.max(1, now - s.lastT)) * 0.3
    s.lastX = e.clientX; s.lastT = now
    let p = idxRef.current - s.dx / width()
    if (p < 0) p = p / 3
    if (p > tabs.length - 1) p = tabs.length - 1 + (p - (tabs.length - 1)) / 3
    setX(p)
  }
  function onUp(): void {
    const s = g.current
    if (s.pointerId === -1) return
    const wasArmed = s.armed          /* 先取判定，再清理（cleanup 会重置 armed） */
    cleanup()
    if (!wasArmed) { setX(idxRef.current, true); return }
    /* 武装过的拖动：抑制松手合成 click（否则行身会打开详情） */
    document.body.dataset.pagerGhost = '1'
    window.setTimeout(() => { delete document.body.dataset.pagerGhost }, 450)
    let next = idxRef.current
    if (s.dx < -width() / 3 || s.vel < -0.5) next = Math.min(tabs.length - 1, idxRef.current + 1)
    else if (s.dx > width() / 3 || s.vel > 0.5) next = Math.max(0, idxRef.current - 1)
    setIndex(next)
    setX(next, true)
  }
  function onWinMove(e: PointerEvent): void {
    const s = g.current
    if (s.pointerId !== e.pointerId) return
    if (!s.armed) {
      const dx = e.clientX - s.startX
      const dy = e.clientY - s.startY
      // iOS 边缘返回手势（≈28px 内）：此处水平拖动交给系统，跳过武装
      const w = window.innerWidth
      const inEdge = s.startX < 28 || s.startX > w - 28
      if (inEdge) return
      if (Math.abs(dx) > ARM_DX && Math.abs(dx) > Math.abs(dy) * 1.2) {
        if (s.fromRow && !document.body.dataset.pagerLock) { cleanup(); return }
        arm()
        s.startX = e.clientX
        s.lastX = e.clientX; s.lastT = performance.now()
      }
      return
    }
    onMove(e)
  }
  function onWinUp(): void { onUp() }

  const onPointerDown = (e: ReactPointerEvent): void => {
    if (tabs.length < 2 || g.current.pointerId !== -1) return
    const t = e.target as HTMLElement
    /* 输入类/链接/勾选框永不接管；按钮允许——长按+拖动是合法翻页起点，
       其松手合成 click 由 pagerGhost 抑制（行身点击处检查） */
    if (t.closest('input, textarea, select, [role="checkbox"], a')) return
    g.current.pointerId = e.pointerId
    g.current.startX = e.clientX
    g.current.startY = e.clientY
    g.current.dx = 0
    g.current.fromRow = !!t.closest('.tl-row__inner, .inbox-row')
    g.current.lastX = e.clientX
    g.current.lastT = performance.now()
    g.current.vel = 0
    g.current.longPress = window.setTimeout(() => {
      if (g.current.pointerId === e.pointerId && !g.current.armed) arm()
    }, LONG_PRESS_MS)
    window.addEventListener('pointermove', onWinMove)
    window.addEventListener('pointerup', onWinUp)
    window.addEventListener('pointercancel', onWinUp)
  }

  const onTabClick = (i: number): void => { setIndex(i); setX(i, true) }

  return (
    <div className="spager" ref={rootRef} style={{ '--pager-x': index, '--pager-n': tabs.length } as React.CSSProperties}>
      <div className="spager__nav" role="tablist" aria-label={ariaLabel}>
        <span className="spager__pill" aria-hidden="true" />
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={i === index}
            className="spager__tab"
            onClick={() => onTabClick(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="spager__viewport" onPointerDown={onPointerDown}>
        <div className="spager__track">
          {tabs.map((tab) => (
            <section key={tab.key} className="spager__page" role="tabpanel" aria-label={tab.label}>
              {tab.content}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
