import { useCallback, useEffect, useRef, useState } from 'react'
import { cardSx } from '../lib/cardSx'
import Paper from '@mui/material/Paper'

export const WEEKDAY_CHARS = ['一', '二', '三', '四', '五', '六', '日']
export const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

interface WeekdaySliderProps {
  value: number // 0–6
  onChange: (v: number) => void
}

/**
 * 可拖拽的周几滑块：毛玻璃质感卡片内，上方进度条可手指拖拽，
 * 下方 7 个日期标签同步高亮。
 */
export function WeekdaySlider({ value, onChange }: WeekdaySliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const pct = (value / 6) * 100

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const idx = Math.round(ratio * 6)
      if (idx !== value) onChange(idx)
    },
    [value, onChange],
  )

  // Pointer 事件统一处理鼠标+触摸
  useEffect(() => {
    if (!dragging) return
    const onMove = (e: PointerEvent) => {
      e.preventDefault()
      updateFromClientX(e.clientX)
    }
    const onUp = () => setDragging(false)
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragging, updateFromClientX])

  return (
    <Paper elevation={0} sx={[cardSx, { p: 2.5 }]}>
      {/* 可拖拽进度条 */}
      <div
        ref={trackRef}
        className="relative h-9 cursor-pointer touch-none select-none"
        onPointerDown={(e) => {
          e.preventDefault()
          setDragging(true)
          updateFromClientX(e.clientX)
        }}
        role="slider"
        aria-label="选择星期"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={6}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' && value > 0) onChange(value - 1)
          if (e.key === 'ArrowRight' && value < 6) onChange(value + 1)
        }}
      >
        {/* 轨道 */}
        <div
          className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: 'var(--tw-overlay-2)' }}
        />
        {/* 已选填充 */}
        <div
          className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: 'var(--foreground)',
            transition: 'width 0.16s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
        {/* 拖拽手柄 */}
        <div
          className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={{
            left: `${pct}%`,
            backgroundColor: 'var(--glass-bg-strong)',
            borderColor: 'var(--foreground)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            transform: `translate(-50%, -50%) scale(${dragging ? 1.15 : 1})`,
            transition: 'transform 0.16s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
        {/* 7 个刻度点 */}
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className="absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${(i / 6) * 100}%`,
              backgroundColor: i <= value ? 'var(--background)' : 'var(--tw-border-l3)',
            }}
          />
        ))}
      </div>

      {/* 日期标签行 */}
      <div className="mt-2.5 flex justify-between">
        {WEEKDAY_CHARS.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className="flex size-8 items-center justify-center rounded-lg text-[13px] font-medium active:opacity-70"
            style={{
              backgroundColor: i === value ? 'var(--foreground)' : 'transparent',
              color: i === value ? 'var(--background)' : 'var(--muted-foreground)',
              fontWeight: i === value ? 700 : 500,
              transition: 'background 0.12s cubic-bezier(0.4,0,0.2,1), color 0.12s cubic-bezier(0.4,0,0.2,1)',
            }}
            aria-label={`周${c}`}
            aria-pressed={i === value}
          >
            {c}
          </button>
        ))}
      </div>
    </Paper>
  )
}
