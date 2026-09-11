import './completion-control.css'

export interface CompletionControlProps {
  checked: boolean
  onChange: () => void
  label: string          /* accessible name：完成「任务名」 */
}

/**
 * Trailing 完成控件（§六重构）：视觉小圆点 18px，命中区 44pt。
 * 三段状态动画：○ →（填充+缩放 200ms）→ ◉ →（描边 250ms spring）→ ✓。
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
        <svg viewBox="0 0 24 24" className="cc__check">
          <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  )
}
