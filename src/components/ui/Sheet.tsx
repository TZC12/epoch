import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './sheet.css'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * 底部 Sheet（唯一弹层容器；glass 三件套 + elev-modal）。
 * Escape 关闭；点遮罩关闭；打开时锁定背景滚动；焦点落在 sheet 内。
 */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="sheet-root" data-open={open}>
      <div className="sheet-scrim" onClick={onClose} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}>
        <div className="sheet__handle" aria-hidden="true" />
        {title && <h2 className="sheet__title t-h3">{title}</h2>}
        <div className="sheet__body no-scrollbar">{children}</div>
        {footer && <div className="sheet__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
