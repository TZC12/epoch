import { useMemo } from 'react'
import { WheelPicker, type WheelPickerOption } from '@/components/motion/wheel-picker'
import { Button } from '@/components/ui/Button'
import './time-wheel.css'

/**
 * 时间滚轮 = beui 官方 WheelPicker（iOS 鼓轮）的两列组合：时 × 5 分钟步进。
 *
 * 本体一律不动（见 motion/wheel-picker.tsx 顶部说明），这里只做三件适配器该做的事：
 *  1. 把 'HH:mm' 拆成两列 options，两列的落位合回一个值；
 *  2. 官方鼓轮的 role=listbox 不播报当前值（两排 li 都 aria-hidden），补一层 sr-only
 *     live region——不然读屏用户转了半天听不到自己在哪；
 *  3. 「清除时间」是我们有的动作，官方没有对应物。
 *
 * 分钟保持 5 分钟步进（12 格）而不是 60 格：与它替换掉的那版手写滚轮同一产品口径，
 * 5 行的窗口里 60 格会滚到手酸。
 */
const HOURS: WheelPickerOption[] = Array.from({ length: 24 }, (_, i) => ({
  label: String(i).padStart(2, '0'),
  value: String(i).padStart(2, '0'),
}))
const MINUTES: WheelPickerOption[] = Array.from({ length: 12 }, (_, i) => ({
  label: String(i * 5).padStart(2, '0'),
  value: String(i * 5).padStart(2, '0'),
}))

export interface TimeWheelProps {
  value: string | null
  onChange: (v: string | null) => void
  clearLabel: string
  /** 组名（role=group） */
  label: string
  /** 两列各自的可访问名：官方把两排 li 都 aria-hidden 了，列名只能由外层给 */
  hourLabel: string
  minuteLabel: string
}

export function TimeWheel({ value, onChange, clearLabel, label, hourLabel, minuteLabel }: TimeWheelProps) {
  const hour = value ? value.slice(0, 2) : undefined
  const minute = value ? value.slice(3, 5) : undefined
  const spoken = useMemo(
    () => (value ? `${hourLabel} ${value.slice(0, 2)} · ${minuteLabel} ${value.slice(3, 5)}` : ''),
    [value, hourLabel, minuteLabel],
  )

  return (
    <div className="twheel" role="group" aria-label={label}>
      <div className="twheel__cols">
        <WheelPicker
          options={HOURS}
          value={hour}
          defaultValue="08"
          onValueChange={(h) => onChange(`${h}:${minute ?? '00'}`)}
          aria-label={hourLabel}
        />
        <WheelPicker
          options={MINUTES}
          value={minute}
          defaultValue="00"
          onValueChange={(m) => onChange(`${hour ?? '08'}:${m}`)}
          aria-label={minuteLabel}
        />
      </div>
      {/* 官方鼓轮不对外播报值，这里补一条：只在值变化时播报 */}
      <span className="sr-only" role="status">{spoken}</span>
      <Button size="sm" variant="ghost" onClick={() => onChange(null)}>{clearLabel}</Button>
    </div>
  )
}
