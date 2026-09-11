import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tag } from '@/components/ui/Chip'
import { useToast } from '@/components/ui/Toast'
import { buildSuggestedDay } from './planMyDay'
import { useData } from '@/services/store'
import { convertInboxItem, updateTask, energyOf } from '@/services/actions'
import { todayKey } from '@/lib/dates'
import { AISuggestSheet } from '@/features/ai/AISuggestSheet'
import './plan-my-day.css'

/**
 * Plan My Day（规则引擎版）：真实数据 → 可解释建议 → 预览 → 确认应用。
 * Accept：inbox 项转换为带时间任务、随时任务定时间；routine/已排为引用不落库。
 */
export function PlanMyDaySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const direction = useData((s) => s.direction)
  const tasks = useData((s) => s.tasks)
  const routines = useData((s) => s.routines)
  const inbox = useData((s) => s.inbox)
  const health = useData((s) => s.health)
  const [accepting, setAccepting] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  const suggestions = useMemo(
    () => (open ? buildSuggestedDay({ direction, tasks, routines, inbox, lowEnergy: energyOf(health) === 'low' }) : []),
    [open, direction, tasks, routines, inbox, health],
  )

  const onAccept = (): void => {
    setAccepting(true)
    const key = todayKey()
    let n = 0
    for (const s of suggestions) {
      if (s.inboxId) {
        if (convertInboxItem(s.inboxId, { date: key, time: s.time, durMin: s.durMin })) n += 1
      } else if (s.taskId && s.reason !== '已排') {
        updateTask(s.taskId, { date: key, time: s.time, durMin: s.durMin })
        n += 1
      }
    }
    setAccepting(false)
    onClose()
    toast(t('pmd.accepted', { n }), { tone: 'success' })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('pmd.title')}
      footer={
        suggestions.length > 0 ? (
          <div className="gsheet-acts">
            <Button variant="ghost" onClick={() => setAiOpen(true)}>{t('ai.planDayTitle')}</Button>
            <Button variant="quiet" onClick={onClose}>{t('pmd.adjust')}</Button>
            <Button loading={accepting} onClick={onAccept}>{t('pmd.accept')}</Button>
          </div>
        ) : undefined
      }
    >
      {suggestions.length === 0 ? (
        <EmptyState title={t('pmd.nothing')} sub={t('pmd.nothingSub')} />
      ) : (
        <div className="pmd">
          {suggestions.map((s) => (
            <div key={s.key} className="pmd__row">
              <span className="pmd__time t-small tnum">{s.time}</span>
              <div className="pmd__main">
                <span className="pmd__title t-small">{s.title}</span>
                <span className="pmd__reason t-caption">{s.reason} · {s.durMin} min</span>
              </div>
              <Tag>
                {s.source === 'routine' ? t('me.routine') : s.source === 'task' ? t('plan.today') : t('plan.inbox')}
              </Tag>
            </div>
          ))}
        </div>
      )}
      <AISuggestSheet ability="plan_day" open={aiOpen} onClose={() => setAiOpen(false)} title={t('ai.planDayTitle')} />
    </Sheet>
  )
}
