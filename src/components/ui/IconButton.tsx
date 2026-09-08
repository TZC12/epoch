import type { ReactNode } from 'react'
import type { ButtonVariant } from './Button'
import './icon-button.css'

export interface IconButtonProps {
  icon: ReactNode
  label: string                       /* icon-only 必须有 accessible label（大纲 §17） */
  onClick?: () => void
  variant?: ButtonVariant | 'plain'
  size?: 'md' | 'sm'
  disabled?: boolean
  className?: string
}

/** icon-only 按钮：强制 aria-label，触控 44px（--touch-min）。 */
export function IconButton({ icon, label, onClick, variant = 'plain', size = 'md', disabled, className = '' }: IconButtonProps) {
  const cls = ['icon-btn', variant === 'plain' ? '' : `btn btn--${variant} btn--icon`, size === 'sm' ? 'icon-btn--sm' : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <button
      type="button"
      className={cls}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      style={size === 'sm' ? undefined : { width: 'var(--touch-min)', height: 'var(--touch-min)' }}
    >
      {icon}
    </button>
  )
}
