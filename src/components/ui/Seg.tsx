import { useCallback, useEffect, useRef, useState } from 'react'
import './seg.css'

export interface SegOption<T extends string> {
  value: T
  label: string
}

export interface SegProps<T extends string> {
  options: readonly SegOption<T>[]
  value: T
  onChange: (v: T) => void
  ariaLabel?: string
  className?: string
}

/**
 * 分段控制（唯一）。Paper Mono：激活态=黑 pill 白字。
 * 滑轨机制来自 Transitions.dev「Tabs sliding」(React self-contained)：
 *   moveTo(idx, animate)——不动画时先存下 inline transition、置 none、落位、reflow、还原；
 *   点击时在 onClick 里立即 moveTo(i, true)，动画从按下那一刻就开始，不等 React 重渲染；
 *   首帧 / resize / 字体加载完成用 rAF 无动画重定位，避免开场飞入与错位。
 */
export function Seg<T extends string>({ options, value, onChange, ariaLabel, className = '' }: SegProps<T>) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [mounted, setMounted] = useState(false)

  const activeIdx = Math.max(0, options.findIndex((o) => o.value === value))
  const idxRef = useRef(activeIdx)
  idxRef.current = activeIdx

  const moveTo = useCallback((idx: number, animate: boolean): void => {
    const pill = pillRef.current
    const tab = btnRefs.current[idx]
    if (!pill || !tab) return
    const prev = pill.style.transition
    if (!animate) pill.style.transition = 'none'
    pill.style.transform = `translateX(${tab.offsetLeft}px)`
    pill.style.width = `${tab.offsetWidth}px`
    if (!animate) {
      void pill.offsetWidth /* 强制 reflow，让 transition:none 生效后再还原 */
      pill.style.transition = prev
    }
  }, [])

  /* 首帧落位 + resize/字体/容器变化的无动画重定位 */
  useEffect(() => {
    const id = requestAnimationFrame(() => moveTo(idxRef.current, false))
    const onResize = (): void => moveTo(idxRef.current, false)
    window.addEventListener('resize', onResize)
    void document.fonts?.ready.then(onResize)
    const ro = wrapRef.current ? new ResizeObserver(onResize) : null
    if (ro && wrapRef.current) ro.observe(wrapRef.current)
    setMounted(true)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', onResize)
      ro?.disconnect()
    }
  }, [moveTo])

  /* 外部受控切换（无点击路径）也走滑动动画；mount 首帧由上面的 rAF 负责 */
  useEffect(() => {
    if (!mounted) return
    moveTo(activeIdx, true)
  }, [mounted, activeIdx, options, moveTo])

  /* role="tablist" 承诺了方向键导航与"整件只占一个 Tab 停靠点"；
     只挂 role 不给键盘模型比三个普通按钮更误导——读屏播报"tab"却按不动。
     处理器挂在 tab 本身上（APG：停靠点是每个 tab，容器不该可聚焦） */
  const onKeyNav = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
    const n = options.length
    if (n === 0) return
    const lastIdx = n - 1
    let next: number | null = null
    if (e.key === 'ArrowRight') next = activeIdx >= lastIdx ? 0 : activeIdx + 1
    else if (e.key === 'ArrowLeft') next = activeIdx <= 0 ? lastIdx : activeIdx - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = lastIdx
    if (next === null) return
    e.preventDefault()
    onChange(options[next].value)
    moveTo(next, true)
    btnRefs.current[next]?.focus()
  }

  return (
    <div ref={wrapRef} className={`seg ${className}`} role="tablist" aria-label={ariaLabel}>
      <span ref={pillRef} className="seg__pill" aria-hidden="true" />
      {options.map((o, i) => {
        const on = i === activeIdx
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className={`seg__btn ${on ? 'on' : ''}`}
            onKeyDown={onKeyNav}
            ref={(el) => { btnRefs.current[i] = el }}
            onClick={() => {
              onChange(o.value)
              moveTo(i, true) /* 按下即滑，不等重渲染 */
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
