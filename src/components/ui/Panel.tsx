import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft } from 'lucide-react'
import './panel.css'

export interface PanelProps {
  open: boolean
  title: string
  onBack: () => void
  backLabel?: string           /* 调用方传 t('common.back')；ui 组件不直接依赖 i18n */
  right?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

/**
 * 推入面板（唯一次级页容器；收敛旧 5 个 push 面板）。
 * 用户偏好：不透明毛玻璃底（绝不透明，否则与下层叠看不清）。
 * Escape=返回；打开锁背景滚动；右侧动作槽。
 */
export function Panel({ open, title, onBack, backLabel, right, children, footer }: PanelProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onBack])

  if (!open) return null
  return createPortal(
    <div className="panel-root">
      <div className="panel" role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}>
        <header className="panel__head">
          <button type="button" className="panel__back" onClick={onBack} aria-label={backLabel ?? title}>
            <ArrowLeft size={20} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <h2 className="panel__title t-h3">{title}</h2>
          <div className="panel__right">{right}</div>
        </header>
        <div className="panel__body no-scrollbar">{children}</div>
        {footer && <div className="panel__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
