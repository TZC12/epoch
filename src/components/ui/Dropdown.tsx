import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import './dropdown.css'

/**
 * Pill-to-card 弹层：触发胶囊膨胀成信息卡（fixed 悬浮、不占布局——
 * 宿主黑卡/周围内容尺寸纹丝不动），收起反向播回胶囊。
 * 动画用 Web Animations API 显式关键帧（pill rect → card rect），不依赖
 * class 切换与内联样式竞争的时序魔法（transition 方案实测方向/起始帧不可控）。
 * origin=top-left 换算：screenX = rect.left + sx×(tx − w/2)，终态 tx=0 贴住钮左上角。
 */
export function Dropdown({ open, onClose, children, label, className, trigger, pos }: {
  open: boolean
  onClose: () => void
  children: ReactNode
  label?: string
  className?: string
  trigger?: HTMLElement | null
  pos?: { top: number; left: number } | null   /* 卡片终态：视口坐标（top / 水平中心） */
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  const animRef = useRef<Animation | null>(null)

  useEffect(() => {
    const card = boxRef.current
    if (!card) return
    const pillTf = (): string | null => {
      if (!trigger) return null
      const c = card.getBoundingClientRect()
      const r = trigger.getBoundingClientRect()
      if (c.width < 2 || c.height < 2) return null
      const sx = r.width / c.width
      const sy = r.height / c.height
      const px = (n: number): string => n.toFixed(2) + 'px'
      /* ⚠ 函数式 scale 用逗号；数值必须带 px 单位——否则整条 transform 非法 */
      return `translateX(-50%) scale(${sx.toFixed(4)}, ${sy.toFixed(4)}) translate(${px((r.left - c.left) / sx + c.width / 2)}, ${px((r.top - c.top) / sy)})`
    }
    animRef.current?.cancel()
    /* reduced-motion：WAAPI 不走 CSS，需显式降为瞬时切换 */
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const dur = (v: number): number => (reduce ? 1 : v)
    if (open) {
      card.style.display = ''
      setShown(true)
      card.style.transformOrigin = 'top left'
      void card.offsetWidth /* display 刚切，强制布局后才能量到真实 rect */
      const from = pillTf()
      const rest = getComputedStyle(card).transform /* CSS 终态（translateX(-50%)） */
      animRef.current = card.animate(
        [{ transform: from ?? rest, opacity: from ? 0.4 : 0 }, { transform: rest, opacity: 1 }],
        { duration: dur(readMs('--dd-open-dur', 300)), easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'none' },
      )
    } else if (shown) {
      const to = pillTf()
      const rest = getComputedStyle(card).transform
      animRef.current = card.animate(
        [{ transform: rest, opacity: 1 }, { transform: to ?? rest, opacity: 0 }],
        { duration: dur(readMs('--dd-close-dur', 220)), easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'none' },
      )
      const id = window.setTimeout(() => { setShown(false); card.style.display = 'none' }, dur(readMs('--dd-close-dur', 220)))
      return () => window.clearTimeout(id)
    }
  }, [open, trigger, shown])

  /* 外点 + Esc 关闭（触发钮自己由 onClick 切换，不在此重复关） */
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent): void => {
      const el = e.target as Node
      if (boxRef.current?.contains(el)) return
      if (el instanceof Element && el.closest('[data-dd-trigger]')) return
      onClose()
    }
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <div
      ref={boxRef}
      role="dialog"
      aria-label={label}
      aria-hidden={!open || undefined}
      className={`dd is-open${className ? ` ${className}` : ''}`}
      style={shown ? { top: pos?.top ?? 128, left: pos?.left ?? '50%' } : { display: 'none' }}
    >
      {children}
    </div>
  )
}

/** 触发钮属性 + ref 回填（Dropdown 需要它的 rect 做膨胀端点）。 */
export function ddTriggerProps(open: boolean, toggle: () => void, setEl: (el: HTMLButtonElement | null) => void): Record<string, unknown> {
  return { type: 'button' as const, 'data-dd-trigger': '', 'aria-expanded': open, onClick: toggle, ref: setEl }
}

function readMs(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}
