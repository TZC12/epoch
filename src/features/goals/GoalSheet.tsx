import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '@/components/ui/Sheet'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { createGoal, updateGoal, setGoalStatus } from '@/services/actions'
import type { Goal } from '@/services/types'

export interface GoalSheetTarget { goal: Goal | 'new' | null }

const KICKERS = ['3-Year', '1-Year', 'Quarter', 'Month', 'Week'] as const

/**
 * Goal 创建/编辑 sheet（Phase 4 死端清理：onboarding 之外终于有目标 CRUD）。
 * 编辑态附状态机动作：暂停/归档/完成。
 */
export function GoalSheet({ target, onClose }: { target: Goal | 'new' | null; onClose: () => void }) {
  const { t } = useTranslation()
  const open = target != null
  const goal = target != null && target !== 'new' ? target : null
  const editing = goal != null

  const [title, setTitle] = useState('')
  const [kicker, setKicker] = useState<string>('Quarter')
  const [note, setNote] = useState('')
  const [focus, setFocus] = useState('')
  const [next, setNext] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(goal?.title ?? '')
    setKicker(goal?.kicker ?? 'Quarter')
    setNote(goal?.note ?? '')
    setFocus(goal?.focus ?? '')
    setNext(goal?.next ?? '')
  }, [open, target, goal])

  const onSave = (): void => {
    const clean = title.trim()
    if (!clean) return
    const patch = { title: clean, kicker, note: note.trim() || null, focus: focus.trim() || null, next: next.trim() || null }
    if (goal) updateGoal(goal.id, patch)
    else createGoal(patch)
    onClose()
  }

  const onStatus = (status: Goal['status']): void => {
    if (goal) setGoalStatus(goal.id, status)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? t('goal.editTitle') : t('goal.newTitle')}
      footer={
        <div className="gsheet-acts">
          <Button variant="quiet" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={onSave} disabled={!title.trim()}>{t('common.save')}</Button>
        </div>
      }
    >
      <div className="gsheet">
        <Field label={t('sheet.fieldTitle')} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('goal.titlePlaceholder')} autoFocus />
        <div className="tsheet__row tsheet__row--col">
          <span className="eyebrow">{t('goal.kickerLabel')}</span>
          <div className="tsheet__chips">
            {KICKERS.map((k) => <Chip key={k} on={kicker === k} onClick={() => setKicker(k)}>{k}</Chip>)}
          </div>
        </div>
        <Field label={t('goal.whyLabel')} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('goal.whyPlaceholder')} />
        <div className="gsheet__two">
          <Field label={t('goal.focus')} value={focus} onChange={(e) => setFocus(e.target.value)} />
          <Field label={t('goal.next')} value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        {editing && (
          <div className="tsheet__row tsheet__row--col">
            <span className="eyebrow">{t('goal.statusLabel')}</span>
            <div className="tsheet__chips">
              {goal.status === 'active' && <Chip onClick={() => onStatus('paused')}>{t('goal.pause')}</Chip>}
              {goal.status === 'paused' && <Chip onClick={() => onStatus('active')}>{t('goal.resume')}</Chip>}
              {goal.status !== 'completed' && <Chip onClick={() => onStatus('completed')}>{t('goal.complete')}</Chip>}
              {goal.status !== 'archived' && <Chip onClick={() => onStatus('archived')}>{t('goal.archive')}</Chip>}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}
