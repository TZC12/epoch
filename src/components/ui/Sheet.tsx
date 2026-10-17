import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './sheet.css'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  tall?: boolean           /* 大表单弹层：88dvh，内容区滚动 */
}

const DISMISS_DIST = 120   /* px：下拖超过即 dismiss */
const DISMISS_VEL = 0.6    /* px/ms：下拖速度超过即 dismiss */

/* 可聚焦元素：弹层内 Tab 收口共用一份名单 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** 从 token 表读毫秒——卸载/settle 两处时钟都跟各自的 CSS 轨道对齐，别各漂各的。 */
function tokenMs(name: string, fallback: number): number {
  const n = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name).trim())
  return Number.isFinite(n) ? n : fallback
}
const exitMs = (): number => tokenMs('--dur-out', 240)

/**
 * 底部 Sheet v2（全弹层唯一容器）：glass + elev-modal；
 * 交互：拖柄/头部下拖跟手 → 距离或速度双阈值 dismiss，否则回弹；Esc/遮罩点击保留为次要关闭；
 * 关闭统一退场动画（进场镜像）后才卸载。
 */
export function Sheet({ open, onClose, title, children, footer, tall }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const drag = useRef({ active: false, startY: 0, dy: 0, lastY: 0, lastT: 0, vel: 0 })

  /* open=false → 先播退场再卸载 */
  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); return }
    if (!mounted) return
    setClosing(true)
    const t = window.setTimeout(() => { setMounted(false); setClosing(false) }, exitMs())
    return () => window.clearTimeout(t)
  }, [open, mounted])

  useEffect(() => {
    if (!mounted) return
    const node = ref.current
    const opener = document.activeElement as HTMLElement | null
    /* 弹层经 portal 挂在 body 上，#root 就是"背景"：inert 让它整体退出焦点序与无障碍树。
       仓库已经在用 inert（bouncy-accordion / swipeable-list），不是新能力依赖。 */
    const backdrop = document.getElementById('root')
    backdrop?.setAttribute('inert', '')
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    /* aria-modal 承诺了焦点收口：Tab / Shift+Tab 只在弹层内首尾互绕，
       否则光标会静悄悄走进被遮罩压住的页面里，读屏播报和屏幕聚焦分家。 */
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !node) return
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => el.getClientRects().length > 0)
      if (items.length === 0) { e.preventDefault(); node.focus(); return }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      /* 焦点还在容器本身（刚打开）等于"从头开始 Tab"，Shift+Tab 该绕到末尾 */
      if (e.shiftKey && (active === first || active === node)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('keydown', onTab)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('keydown', onTab)
      document.body.style.overflow = prev
      backdrop?.removeAttribute('inert')
      /* 关窗后把焦点还给用户当初点开它的那个控件，不然每次都得从头 Tab 一遍 */
      if (opener && opener !== document.body && opener.isConnected) opener.focus()
    }
  }, [mounted, onClose])

  if (!mounted) return null

  const startDrag = (e: ReactPointerEvent): void => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    /* 仅拖柄/头部/留白可拖；表单、按钮、输入一律不接管（不破坏滚动与输入） */
    const t = e.target as HTMLElement
    if (t.closest('.sheet__body, .sheet__footer, button, input, textarea, select, a, label')) return
    drag.current = { active: true, startY: e.clientY, dy: 0, lastY: e.clientY, lastT: performance.now(), vel: 0 }
    ref.current?.classList.add('sheet--drag')
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
  }
  const moveDrag = (e: ReactPointerEvent): void => {
    if (!drag.current.active || !ref.current) return
    const d = drag.current
    d.dy = Math.max(0, e.clientY - d.startY)          /* 只允许向下 */
    const now = performance.now()
    const dt = Math.max(1, now - d.lastT)
    d.vel = d.vel * 0.7 + ((e.clientY - d.lastY) / dt) * 0.3
    d.lastY = e.clientY; d.lastT = now
    ref.current.style.transform = `translateY(${d.dy}px)`
    const scrim = ref.current.parentElement?.querySelector('.sheet-scrim') as HTMLElement | null
    if (scrim) scrim.style.opacity = String(Math.max(0, 1 - d.dy / 400))
  }
  const endDrag = (): void => {
    if (!drag.current.active || !ref.current) return
    drag.current.active = false
    ref.current.classList.remove('sheet--drag')
    const d = drag.current
    const scrim = ref.current.parentElement?.querySelector('.sheet-scrim') as HTMLElement | null
    if (scrim) scrim.style.opacity = ''
    if (d.dy > DISMISS_DIST || d.vel > DISMISS_VEL) {
      ref.current.style.transform = ''
      onClose()                                        /* open=false → 退场动画接管 */
    } else {
      ref.current.style.transform = 'translateY(0)'    /* 回弹（有 transition） */
      const el = ref.current
      const settleTimer = window.setTimeout(() => { el.style.transform = '' }, tokenMs('--dur-3', 250))
      // 不在 cleanup 里清：settle 期内 sheet 一般未卸载；超时后 id 已自然失效
      void settleTimer
    }
    d.dy = 0; d.vel = 0
  }

  const cls = [
    'sheet',
    tall ? 'sheet--tall' : '',
    closing ? 'sheet--closing' : '',
  ].filter(Boolean).join(' ')

  return createPortal(
    <div className="sheet-root">
      <div className={`sheet-scrim ${closing ? 'sheet-scrim--closing' : ''}`} onClick={onClose} aria-hidden="true" />
      <div
        className={cls}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        tabIndex={-1}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="sheet__handle" aria-hidden="true" />
        {title && <h2 className="sheet__title t-h3">{title}</h2>}
        <div className="sheet__body no-scrollbar">{children}</div>
        {footer && <div className="sheet__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
