import { Check } from 'lucide-react'
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
 * 视觉 22px 圆环 + 44px 热区；reveal 仅颜色/透明度过渡，无缩放无爆炸。
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
        {checked && <Check size={13} strokeWidth={2.5} />}
      </span>
    </button>
  )
}
