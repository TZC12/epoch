import { useState } from 'react'
import './toggle.css'

export interface ToggleProps {
  checked: boolean
  onChange: () => void
  label: string
}

/**
 * 开关（Transitions.dev「Toggle」机制，皮肤 Paper Mono）：设定类任务的启用/停用，
 * 不是完成勾选——完成语义仍归 CompletionControl（绿✓）。
 * 双段回弹：is-init 门控 keyframes（挂载不播「关」动画），翻 data-on 即重放
 * 越过 1px 再回落的行程（350ms cubic-bezier(0.34,1.35,0.64,1)）。
 * role=switch + aria-checked；::before 把触控热区撑到 44pt。
 */
export function Toggle({ checked, onChange, label }: ToggleProps) {
  const [init, setInit] = useState(false)
  return (
    <button
      type="button"
      className={`tgl ${init ? 'is-init' : ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-on={checked ? 'true' : 'false'}
      onClick={(e) => { e.stopPropagation(); setInit(true); onChange() }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="tgl__thumb" aria-hidden="true" />
    </button>
  )
}
