import './seg.css'

export interface SegOption<T extends string> {
  value: T
  label: string
}

export interface SegProps<T extends string> {
  options: readonly SegOption<T>[]
  value: T
  onChange: (v: T) => void
  ariaLabel?: string
  className?: string
}

/**
 * 分段控制（唯一）。Paper Mono：激活态=黑 pill 白字。
 * 键盘：左右箭头切换（原生 radio 语义）。
 */
export function Seg<T extends string>({ options, value, onChange, ariaLabel, className = '' }: SegProps<T>) {
  return (
    <div className={`seg ${className}`} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            className={`seg__btn ${on ? 'on' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
