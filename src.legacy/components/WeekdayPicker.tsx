import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'

export const WEEKDAY_CHARS = ['一', '二', '三', '四', '五', '六', '日']

interface Props {
  value: number[]
  onChange: (v: number[]) => void
}

/** 多选星期（0=周一 … 6=周日） */
export function WeekdayPicker({ value, onChange }: Props) {
  return (
    <ToggleButtonGroup
      value={value}
      onChange={(_e, next: number[]) => next.length > 0 && onChange(next)}
      aria-label="选择适用星期"
      fullWidth
    >
      {WEEKDAY_CHARS.map((c, i) => (
        <ToggleButton
          key={i}
          value={i}
          aria-label={`周${c}`}
          sx={{
            height: 44,
            bgcolor: 'var(--surface-container)',
            color: 'var(--muted-foreground)',
            border: 'none',
            '&.Mui-selected': {
              bgcolor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              '&:hover': { bgcolor: 'var(--accent-hover)' },
            },
          }}
        >
          {c}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
