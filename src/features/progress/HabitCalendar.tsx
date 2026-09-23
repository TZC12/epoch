import { useTranslation } from 'react-i18next'
import { Flame } from 'lucide-react'
import { useHabitsReview } from '@/services/queries'
import type { HabitStatus } from '@/lib/schedule'
import './habit-calendar.css'

/** HabitStatus → 单元格语义类（无假数据：不应期就是空）。 */
function cellClass(status: HabitStatus): string {
  switch (status) {
    case 'completed':
    case 'overCompleted':
    case 'sortedOutBacklog':
      return 'is-done'
    case 'planned':
      return 'is-planned'
    case 'backlog':
      return 'is-backlog'
    case 'failed':
      return 'is-fail'
    default:
      return 'is-idle'
  }
}

/**
 * 习惯回顾日历（Progress 层）：把 RoutineTracker 的自适应日程状态逐日铺成点阵，
 * 与 Today 习惯条同源派生——今日勾选即时反映到这里的连续记录与状态。
 */
export function HabitCalendar() {
  const { t } = useTranslation()
  const habits = useHabitsReview(28)
  if (habits.length === 0) return null

  return (
    <section className="hcal" aria-label={t('progress.habits')}>
      <h2 className="eyebrow sec-title">{t('progress.habits')}</h2>
      <div className="hcal__list">
        {habits.map(({ routine, streak, statuses }) => (
          <div key={routine.id} className="hcal__row">
            <div className="hcal__meta">
              <span className="hcal__name t-small">{routine.name}</span>
              {streak.current > 1 && (
                <span className="hcal__streak t-caption tnum"><Flame size={14} aria-hidden="true" />{streak.current}</span>
              )}
            </div>
            <div className="hcal__strip" role="img" aria-label={`${routine.name} · ${t('progress.habitStreakLongest')} ${streak.longest}`}>
              {statuses.map(({ date, status }) => (
                <i key={date} className={`hcal__cell ${cellClass(status)}`} title={`${date} · ${status}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="legend t-caption">
        <span><i className="hcal__cell is-done" /> {t('progress.legendDone')}</span>
        <span><i className="hcal__cell is-planned" /> {t('progress.legendToday')}</span>
        <span><i className="hcal__cell is-backlog" /> {t('progress.legendBacklog')}</span>
        <span><i className="hcal__cell is-fail" /> {t('progress.legendMiss')}</span>
      </div>
    </section>
  )
}
