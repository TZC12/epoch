import { Flame } from 'lucide-react'
import './habit-chip.css'

export interface HabitChipProps {
  name: string
  sub?: string
  done?: boolean
  streak?: number
  backlog?: boolean
  onToggle?: () => void
  disabled?: boolean
  className?: string
}

/** 习惯 chip：pill + aria-pressed；done=accent 描边语义；streak=Flame 连击；backlog=补做标记。 */
export function HabitChip({ name, sub, done, streak, backlog, onToggle, disabled, className = '' }: HabitChipProps) {
  return (
    <button
      type="button"
      aria-pressed={!!done}
      disabled={disabled}
      onClick={onToggle}
      className={`hchip ${done ? 'hchip--on' : ''} ${backlog && !done ? 'hchip--backlog' : ''}`.trim() + (className ? ` ${className}` : '')}
    >
      <span className="hchip__name t-small">{name}</span>
      {sub && <span className="hchip__sub t-caption">{sub}</span>}
      {backlog && !done && <span className="hchip__tag t-caption">补</span>}
      {!!streak && streak > 1 && (
        <span className="hchip__streak t-caption tnum" aria-label={`连击 ${streak}`}><Flame size={14} aria-hidden="true" />{streak}</span>
      )}
    </button>
  )
}
