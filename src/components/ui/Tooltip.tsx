import { useId, useRef, type ReactNode } from 'react'
import './tooltip.css'

/**
 * 悬浮提示组（机制来自 Transitions.dev「Tooltip open/close」，皮肤跟 Paper Mono：
 * ink 底 + ink-inverse 字）。一组一个气泡，在触发点之间「滑行」：
 *  - 显示中换目标 → translate/width 补间（160ms easeOutQuint），气泡跟着指针走；
 *  - 隐藏时换目标 → transition:none 先落位再播「出现」（80ms 延迟）；
 *  - 出现 150ms / 收起 50ms 双时钟——收起更快，连点不闪烁；
 *  - 触屏：按下 → 80ms 内出现动画未启动即 pointerleave → 保持隐藏，点击零打扰。
 * 用法：TipGroup 包住触发点容器，触发点（或其任意祖先节点）挂 data-tip="文案"。
 */
export function TipGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  const groupRef = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const id = useId()

  const hide = (): void => {
    const t = tipRef.current
    if (!t) return
    t.setAttribute('data-show', 'false')
    t.setAttribute('aria-hidden', 'true')
  }

  const place = (trigger: HTMLElement, label: string): void => {
    const t = tipRef.current
    const txt = textRef.current
    const g = groupRef.current
    if (!t || !txt || !g || !label) return
    const showing = t.getAttribute('data-show') === 'true'
    txt.textContent = label
    const cs = getComputedStyle(t)
    const width = Math.ceil(txt.scrollWidth + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight))
    const gr = g.getBoundingClientRect()
    const r = trigger.getBoundingClientRect()
    /* 居中于触发点，但整体夹在组的边界内（窄组/边缘项不出血）；
       --tt-y = 触发点距组顶的偏移：多行组（如 2×2 模块卡）气泡贴住自己那行，
       行间切换时走位和 x 一起补间。 */
    let x = r.left - gr.left + r.width / 2 - width / 2
    x = Math.max(0, Math.min(x, Math.max(0, gr.width - width)))
    const y = r.top - gr.top
    if (!showing) {
      /* 隐藏态先无过渡落位：只播「出现」，不播「从上一个位置飞来」 */
      t.style.transition = 'none'
      t.style.width = `${width}px`
      t.style.setProperty('--tt-x', `${x}px`)
      t.style.setProperty('--tt-y', `${y}px`)
      void t.offsetWidth
      t.style.transition = ''
    } else {
      t.style.width = `${width}px`
      t.style.setProperty('--tt-x', `${x}px`)
      t.style.setProperty('--tt-y', `${y}px`)
    }
    t.setAttribute('data-show', 'true')
    t.setAttribute('aria-hidden', 'false')
  }

  /** pointerover/focus 都是冒泡事件：从任意后代找最近的 [data-tip]。 */
  const fromEvent = (el: EventTarget | null): void => {
    if (!(el instanceof Element)) return
    const trig = el.closest<HTMLElement>('[data-tip]')
    if (trig && groupRef.current?.contains(trig)) place(trig, trig.dataset.tip ?? '')
  }

  return (
    <span
      ref={groupRef}
      className={`tip-group ${className}`}
      onPointerOver={(e) => fromEvent(e.target)}
      onPointerLeave={hide}
      onFocus={(e) => fromEvent(e.target)}
      onBlur={hide}
    >
      {children}
      <span ref={tipRef} id={id} className="tip" role="tooltip" aria-hidden="true" data-show="false">
        <span ref={textRef} className="tip__text" />
      </span>
    </span>
  )
}
