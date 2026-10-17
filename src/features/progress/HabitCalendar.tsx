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

/** 逐档计数，用来把"28 天都在画什么"读给读屏——点阵本身对 AT 是一片死寂。 */
function tally(statuses: { status: HabitStatus }[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const s of statuses) {
    const cls = cellClass(s.status)
    out.set(cls, (out.get(cls) ?? 0) + 1)
  }
  return out
}

/**
 * 习惯回顾日历（Progress 层）：把 RoutineTracker 的自适应日程状态逐日铺成点阵，
 * 与 Today 习惯条同源派生——今日勾选即时反映到这里的连续记录与状态。
 */
export function HabitCalendar() {
  const { t, i18n } = useTranslation()
  const habits = useHabitsReview(28)
  if (habits.length === 0) return null

  const fmtDay = new Intl.DateTimeFormat(i18n.language, { month: 'numeric', day: 'numeric' })
  const first = habits[0]?.statuses[0]?.date
  const last = habits[0]?.statuses[habits[0].statuses.length - 1]?.date
  /* 图例四档 + 第五档（未排期）：点阵会画五档，图例只声明四档时，
     灰点就成了没有说明的第五种东西。 */
  const legendKey: Record<string, string> = {
    'is-done': 'progress.legendDone',
    'is-planned': 'progress.legendToday',
    'is-backlog': 'progress.legendBacklog',
    'is-fail': 'progress.legendMiss',
    'is-idle': 'progress.legendIdle',
  }

  return (
    <section className="hcal" aria-label={t('progress.habits')}>
      <h2 className="eyebrow sec-title">{t('progress.habits')}</h2>
      <div className="hcal__list">
        {habits.map(({ routine, streak, statuses }) => {
          const counts = tally(statuses)
          const spoken = Object.entries(legendKey)
            .map(([cls, key]) => `${t(key)} ${counts.get(cls) ?? 0}`)
            .join(' · ')
          return (
            <div key={routine.id} className="hcal__row">
              <div className="hcal__meta">
                <span className="hcal__name t-small">{routine.name}</span>
                {streak.current > 1 && (
                  <span className="hcal__streak t-caption tnum"><Flame size={14} aria-hidden="true" />{streak.current}</span>
                )}
              </div>
              <div className="hcal__strip" role="img" aria-label={`${routine.name} · ${t('progress.habitStreakLongest')} ${streak.longest} · ${spoken}`}>
                {statuses.map(({ date, status }) => (
                  <i key={date} className={`hcal__cell ${cellClass(status)}`} title={`${date} · ${t(legendKey[cellClass(status)])}`} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      {/* 朝向与窗口：左旧右新，屏幕上原先一个字都没说 */}
      {first && last && (
        <div className="hcal__axis t-caption tnum">
          <span>{fmtDay.format(new Date(`${first}T12:00:00`))}</span>
          <span>{t('plan.today')} · {fmtDay.format(new Date(`${last}T12:00:00`))}</span>
        </div>
      )}
      <div className="legend t-caption">
        <span><i className="hcal__cell is-done" /> {t('progress.legendDone')}</span>
        <span><i className="hcal__cell is-planned" /> {t('progress.legendToday')}</span>
        <span><i className="hcal__cell is-backlog" /> {t('progress.legendBacklog')}</span>
        <span><i className="hcal__cell is-fail" /> {t('progress.legendMiss')}</span>
        <span><i className="hcal__cell is-idle" /> {t('progress.legendIdle')}</span>
      </div>
    </section>
  )
}
