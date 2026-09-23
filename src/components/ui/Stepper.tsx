import { useTranslation } from 'react-i18next'
import {
  AdaptiveStepper,
  AdaptiveStepperDecrement,
  AdaptiveStepperIncrement,
  AdaptiveStepperTypedValue,
} from '@/components/motion/adaptive-stepper'

/**
 * Epoch 侧的薄适配层：真正的实现是官方 @beui/adaptive-stepper（含 liquid 滤镜），
 * 这里只做三件官方没有覆盖到我们场景的事：
 *  1. 官方 value 是 number，我们的表单字段是 string（空串=没记），要来回换算；
 *  2. 官方没有"空值"概念——用 formatValueText 闭包把空串映射成空显示，
 *     否则打开健康记录表会凭空显示 min 值，把"没记"变成"记了 0"；
 *  3. 官方部件是固定 216px 的独立控件，我们表单里还需要一个可见标签与单位。
 */
export function Stepper({ label, value, onChange, min = 0, max = 9999, step = 1, decimals = 0, fallback, unit, disabled }: {
  label: string
  value: string
  onChange: (next: string) => void
  min?: number
  max?: number
  step?: number
  decimals?: number
  /** 空值时第一次按 ± 的起点（默认 min）。 */
  fallback?: number
  unit?: string
  disabled?: boolean
}) {
  const { t } = useTranslation()

  const num = value.trim() === '' ? Number.NaN : Number(value)
  const empty = Number.isNaN(num)
  /* 空值时把控件停在 fallback 上：它只是"未记录"时的落点，± 从那里起走一格。
     不要在 onValueChange 里对空值做特判——键入提交时字符串也还是空的，
     特例会连带把用户打的精确值改掉（实测把 7342 吞成 5000）。 */
  const current = empty ? (fallback ?? min) : num
  const fmt = (n: number): string => (decimals > 0 ? n.toFixed(decimals) : String(Math.round(n)))

  return (
    <div className="flex flex-col gap-2">
      <span className="eyebrow text-subtle">{label}</span>
      <div className="flex items-center gap-2">
        <AdaptiveStepper
          aria-label={label}
          value={current}
          onValueChange={(n) => onChange(fmt(n))}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          formatValueText={(n) => (empty ? '' : fmt(n))}
        >
          <AdaptiveStepperDecrement aria-label={t('a11y.stepperMinus', { label })} />
          <AdaptiveStepperTypedValue aria-label={label} />
          <AdaptiveStepperIncrement aria-label={t('a11y.stepperPlus', { label })} />
        </AdaptiveStepper>
        {unit && <span className="shrink-0 text-caption text-subtle">{unit}</span>}
      </div>
    </div>
  )
}
