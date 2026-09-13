import { MorphIcon } from 'morphicons/react'
import { squareNode, checkNode } from '@/lib/morph-icons'
import './checkbox.css'

export interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  className?: string
}

/**
 * 完成勾选（唯一强调色语义：绿=完成/活跃）。
 * 视觉 22px 方框 + 44px 热区；□→✓ 用 MorphIcons 弹簧形变（snappy；reducedMotion=user）。
 */
export function Checkbox({ checked, onChange, label, disabled, className = '' }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`ck ${checked ? 'ck--on' : ''} ${className}`.trim()}
      onClick={() => onChange(!checked)}
    >
      <span className="ck__box" aria-hidden="true">
        <MorphIcon
          icon={checked ? checkNode : squareNode}
          spring="snappy"
          reducedMotion="user"
          className="ck__morph"
        />
      </span>
    </button>
  )
}
