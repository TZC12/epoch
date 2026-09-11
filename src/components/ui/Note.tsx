import { Textarea } from './Field'
import './note.css'

export interface NoteProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  maxLength?: number
  disabled?: boolean
  className?: string
}

/** 长文本备注（任务备注/复盘/反思）：受控 Textarea + 可选计数。placeholder 永不当 label。 */
export function Note({ label, value, onChange, placeholder, rows = 3, maxLength, disabled, className = '' }: NoteProps) {
  return (
    <div className={`note ${className}`.trim()}>
      <Textarea
        label={label}
        value={value}
        rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {maxLength != null && (
        <div className="note__count t-caption tnum">{value.length}/{maxLength}</div>
      )}
    </div>
  )
}
