import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import type { Task } from '@/services/types'
import './widgets.css'

/**
 * 今日事件提醒卡（图二映射）：「今天 · N 个事件」+ 左竖线行（时间区间 + 标题）。
 * 只列有时间的任务（Event ≡ Task(time)）；按时间排序，取前 3 条 + 计数。
 */
export function EventsReminder({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  const { t } = useTranslation()
  const events = tasks
    .filter((x) => x.time != null && x.status !== 'cancelled' && x.status !== 'skipped')
    .sort((a, b) => a.time!.localeCompare(b.time!))
  if (events.length === 0) return null

  const shown = events.slice(0, 3)
  return (
    <Card pad="md" className="evcard">
      <div className="evcard__head">
        <span className="t-h3">{t('events.title')}</span>
        <span className="t-caption tnum">{t('events.count', { n: events.length })}</span>
      </div>
      <div className="evcard__list">
        {shown.map((e) => (
          <button key={e.id} type="button" className="evcard__row" onClick={() => onOpen(e)}>
            <span className="evcard__bar" aria-hidden="true" />
            <span className="evcard__main">
              <span className="evcard__title t-small">{e.title}</span>
              {e.note && <span className="t-caption">{e.note}</span>}
            </span>
            <span className="evcard__time t-caption tnum">{e.time}</span>
          </button>
        ))}
      </div>
    </Card>
  )
}
