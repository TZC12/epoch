import './habit-chip.css'

export interface HabitChipProps {
  name: string
  sub?: string
  done?: boolean
  onToggle?: () => void
  disabled?: boolean
  className?: string
}

/** 习惯 chip：pill + aria-pressed；done=accent 描边语义（完成/活跃）。 */
export function HabitChip({ name, sub, done, onToggle, disabled, className = '' }: HabitChipProps) {
  return (
    <button
      type="button"
      aria-pressed={!!done}
      disabled={disabled}
      onClick={onToggle}
      className={`hchip ${done ? 'hchip--on' : ''} ${className}`.trim()}
    >
      <span className="hchip__name t-small">{name}</span>
      {sub && <span className="hchip__sub t-caption">{sub}</span>}
    </button>
  )
}
