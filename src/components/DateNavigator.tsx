import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { dateKey, addDays, WEEKDAY_ZH } from '@/lib/dates'
import './date-navigator.css'

export interface DateNavigatorProps {
  selected: string          /* 'YYYY-MM-DD' */
  onSelect: (key: string) => void
}

/**
 * 日期导航（图三映射）：月份 < 2025年10月 > + 五日窗横滑条（选中日黑 pill 高亮）。
 * 选日期驱动主页三张卡（任务/事件/收集箱按此日过滤）。
 */
export function DateNavigator({ selected, onSelect }: DateNavigatorProps) {
  const { t, i18n } = useTranslation()
  const zh = i18n.language.startsWith('zh')
  const sel = new Date(`${selected}T12:00:00`)

  const shiftMonth = (n: number): void => {
    const next = new Date(sel.getFullYear(), sel.getMonth() + n, 1)
    onSelect(dateKey(next))
  }
  const shiftDay = (n: number): void => onSelect(dateKey(addDays(sel, n)))

  /* 五日窗：以选中日为中间（选中日居中，可看到前后文） */
  const days = Array.from({ length: 5 }, (_, i) => addDays(sel, i - 2))
  const monthLabel = zh
    ? `${sel.getFullYear()}年${sel.getMonth() + 1}月`
    : sel.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const weekdayLabel = (d: Date): string =>
    zh ? `周${WEEKDAY_ZH[(d.getDay() + 6) % 7]}` : d.toLocaleDateString('en-US', { weekday: 'short' })

  return (
    <div className="datenav">
      <div className="datenav__month">
        <button type="button" className="datenav__nav" onClick={() => shiftMonth(-1)} aria-label={t('a11y.prevMonth')}>
          <ChevronLeft size={16} strokeWidth={1.8} />
        </button>
        <span className="datenav__monthlabel t-small tnum">{monthLabel}</span>
        <button type="button" className="datenav__nav" onClick={() => shiftMonth(1)} aria-label={t('a11y.nextMonth')}>
          <ChevronRight size={16} strokeWidth={1.8} />
        </button>
      </div>

      <div className="datenav__strip">
        <button type="button" className="datenav__nav" onClick={() => shiftDay(-1)} aria-label={t('a11y.prevDay')}>
          <ChevronLeft size={16} strokeWidth={1.8} />
        </button>
        <div className="datenav__days">
          {days.map((d) => {
            const k = dateKey(d)
            const on = k === selected
            return (
              <button
                key={k}
                type="button"
                className={`datenav__day ${on ? 'on' : ''}`}
                onClick={() => onSelect(k)}
                aria-pressed={on}
                aria-label={`${d.getMonth() + 1}-${d.getDate()}`}
              >
                <span className="datenav__wd t-caption">{weekdayLabel(d)}</span>
                <span className="datenav__num tnum">{String(d.getDate()).padStart(2, '0')}</span>
              </button>
            )
          })}
        </div>
        <button type="button" className="datenav__nav" onClick={() => shiftDay(1)} aria-label={t('a11y.nextDay')}>
          <ChevronRight size={16} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}
