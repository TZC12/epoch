import { MorphIcon } from 'morphicons/react'
import { circleNode, checkNode } from '@/lib/morph-icons'
import './completion-control.css'

export interface CompletionControlProps {
  checked: boolean
  onChange: () => void
  label: string          /* accessible name：完成「任务名」 */
}

/**
 * Trailing 完成控件（§六重构）：视觉小圆点 18px，命中区 44pt。
 * ○→✓ 用 MorphIcons 弹簧形变（snappy，轻微过冲不弹跳；reducedMotion=user 跟随系统）。
 * role=checkbox（位置无关的可达性/测试锚点）。
 */
export function CompletionControl({ checked, onChange, label }: CompletionControlProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={`cc ${checked ? 'cc--on' : ''}`}
      onClick={(e) => { e.stopPropagation(); onChange() }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="cc__dot" aria-hidden="true">
        <MorphIcon
          icon={checked ? checkNode : circleNode}
          spring="snappy"
          reducedMotion="user"
          className="cc__morph"
        />
      </span>
    </button>
  )
}
