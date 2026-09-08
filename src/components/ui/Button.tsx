import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import './button.css'

export type ButtonVariant = 'primary' | 'quiet' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  block?: boolean
  children?: ReactNode
}

/**
 * 唯一按钮组件（收敛旧 11 种形态）。
 * primary = 墨色 pill（Paper Mono 主操作，深色自动反白）
 * quiet   = sunken 底次按钮
 * ghost   = 透明文字按钮
 * danger  = 红底变体（破坏性确认），不用时永远不出现
 * 状态：default/hover/pressed/focus/disabled/loading（八态矩阵的交互六态）
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, block = false, className = '', disabled, children, ...rest },
  ref,
) {
  const cls = ['btn', `btn--${variant}`, size === 'sm' ? 'btn--sm' : '', block ? 'btn--block' : '', loading ? 'is-loading' : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <button ref={ref} type="button" className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {children}
    </button>
  )
})
