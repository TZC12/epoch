import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel } from '@/components/ui/Panel'
import { Row } from '@/components/ui/Row'
import { Pbar } from '@/components/ui/Pbar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tag } from '@/components/ui/Chip'
import { IconButton } from '@/components/ui/IconButton'
import { Pencil } from 'lucide-react'
import { GoalSheet } from './GoalSheet'
import { useData, goalPct, isDoneToday } from '@/services/store'
import { dateKey } from '@/lib/dates'
import './goal-panel.css'

/**
 * Goal 详情（真实数据版——取代 legacy 静态演示区「关联例程(2)/关联任务(4)」）：
 * Why(kicker/note) → 阶梯(ladder，当前层高亮) → 真实 pct → 当前焦点/下一步 → 关联例程/任务（state 派生）。
 * Phase 4：编辑 sheet + 状态机（paused/archived/completed）已接入。
 */
export default function GoalPanel() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const goals = useData((s) => s.goals)
  const tasksAll = useData((s) => s.tasks)
  const routinesAll = useData((s) => s.routines)
  const logs = useData((s) => s.habitLogs)
  const [editOpen, setEditOpen] = useState(false)

  const goal = goals.find((g) => g.id === id)
  const close = () => navigate(-1)

  if (!goal) {
    return (
      <Panel open title={t('goal.notFound')} onBack={close} backLabel={t('common.back')}>
        <EmptyState title={t('goal.notFound')} />
      </Panel>
    )
  }

  const pct = goalPct(goal.id, tasksAll, logs, routinesAll)
  const relTasks = tasksAll.filter((x) => x.goalId === goal.id && x.status !== 'cancelled')
  const relRoutines = routinesAll.filter((r) => r.goalId === goal.id && !r.archived)
  const cur = new Date()

  return (
    <Panel
      open
      title={goal.title}
      onBack={close}
      backLabel={t('common.back')}
      right={<IconButton size="sm" icon={<Pencil size={16} strokeWidth={1.8} aria-hidden="true" />} label={t('common.edit')} onClick={() => setEditOpen(true)} />}
    >
      <div className="goalp">
        {goal.kicker && <p className="eyebrow">{goal.kicker}</p>}
        <h1 className="t-h2">{goal.title}</h1>
        {goal.note && <p className="t-small goalp__note">{goal.note}</p>}

        <div className="goalp__pct">
          <Pbar pct={pct} done={pct >= 100} label={`${pct}%`} />
        </div>

        {goal.ladder.length > 0 && (
          <section aria-label="ladder" className="goalp__sec">
            <h2 className="eyebrow sec-title">Ladder</h2>
            <div className="goalp__ladder">
              {goal.ladder.map((step) => (
                <div key={step.lv} className={`goalp__step ${step.cur ? 'cur' : ''}`}>
                  <span className="goalp__lv t-caption">{step.lv}</span>
                  <span className={`t-small ${step.cur ? 'goalp__step-cur' : ''}`}>{step.t}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {(goal.focus || goal.next) && (
          <section className="goalp__sec">
            {goal.focus && (
              <div className="goalp__focus">
                <span className="eyebrow">{t('goal.focus')}</span>
                <p className="t-small">{goal.focus}</p>
              </div>
            )}
            {goal.next && (
              <div className="goalp__focus">
                <span className="eyebrow">{t('goal.next')}</span>
                <p className="t-small">{goal.next}</p>
              </div>
            )}
          </section>
        )}

        <section className="goalp__sec">
          <h2 className="eyebrow sec-title">{t('goal.routines', { n: relRoutines.length })}</h2>
          {relRoutines.length === 0 ? (
            <p className="t-caption">{t('me.noRoutines')}</p>
          ) : (
            relRoutines.map((r) => (
              <Row key={r.id} title={r.name} sub={[r.time, r.sub].filter(Boolean).join(' · ') || undefined} right={<Tag>{r.kind === 'habit' ? t('me.habit') : t('me.routine')}</Tag>} />
            ))
          )}
        </section>

        <section className="goalp__sec">
          <h2 className="eyebrow sec-title">{t('goal.tasks', { n: relTasks.length })}</h2>
          {relTasks.length === 0 ? (
            <p className="t-caption">{t('goal.noTasks')}</p>
          ) : (
            relTasks
              .slice()
              .sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
              .map((task) => {
                const done = isDoneToday(task, task.date ?? dateKey(cur))
                return (
                  <Row
                    key={task.id}
                    title={task.title}
                    sub={[task.date ?? t('sheet.todayChip'), task.time].filter(Boolean).join(' · ')}
                    right={<Tag tone={done ? 'accent' : 'neutral'}>{done ? t('common.done') : task.status === 'skipped' ? t('common.skip') : '·'}</Tag>}
                  />
                )
              })
          )}
        </section>
      </div>
      <GoalSheet target={editOpen ? goal : null} onClose={() => setEditOpen(false)} />
    </Panel>
  )
}
