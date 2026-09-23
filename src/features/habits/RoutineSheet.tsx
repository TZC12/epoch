import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '@/components/ui/Sheet'
import { Field } from '@/components/ui/Field'
import { Stepper } from '@/components/ui/Stepper'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { TimeWheel } from '@/components/ui/TimeWheel'
import { createRoutine, updateRoutine, archiveRoutine } from '@/services/actions'
import { useData } from '@/services/store'
import type { Routine } from '@/services/types'

/**
 * 例程创建/编辑 sheet（Phase 4：Routines=定义，habit_logs=打卡——归档不清历史）。
 */
export function RoutineSheet({ target, onClose }: { target: Routine | 'new' | null; onClose: () => void }) {
  const { t } = useTranslation()
  const open = target != null
  const routine = target != null && target !== 'new' ? target : null
  const editing = routine != null

  const goalsAll = useData((s) => s.goals)
  const goals = goalsAll.filter((g) => g.status === 'active')

  const [name, setName] = useState('')
  const [sub, setSub] = useState('')
  const [time, setTime] = useState('')
  const [durMin, setDurMin] = useState('')
  const [goalId, setGoalId] = useState<string | null>(null)
  const [kind, setKind] = useState<'habit' | 'routine'>('habit')

  useEffect(() => {
    if (!open) return
    setName(routine?.name ?? '')
    setSub(routine?.sub ?? '')
    setTime(routine?.time ?? '')
    setDurMin(routine?.durMin != null ? String(routine.durMin) : '')
    setGoalId(routine?.goalId ?? null)
    setKind(routine?.kind ?? 'habit')
  }, [open, target, routine])

  const onSave = (): void => {
    const clean = name.trim()
    if (!clean) return
    const patch = {
      name: clean,
      sub: sub.trim() || null,
      time: time.trim() || null,
      durMin: durMin ? Math.max(0, Number(durMin)) : null,
      goalId,
      kind,
    }
    if (routine) updateRoutine(routine.id, patch)
    else createRoutine(patch)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? t('routine.editTitle') : t('routine.newTitle')}
      footer={
        <div className="gsheet-acts">
          <Button variant="quiet" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={onSave} disabled={!name.trim()}>{t('common.save')}</Button>
        </div>
      }
    >
      <div className="gsheet">
        {/* 同 GoalSheet：模态内自动聚焦是正确 a11y 行为 */}
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <Field label={t('routine.nameLabel')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('routine.namePlaceholder')} autoFocus />
        <div className="tsheet__row tsheet__row--col">
          <span className="eyebrow">{t('routine.kindLabel')}</span>
          <div className="tsheet__chips">
            <Chip on={kind === 'habit'} onClick={() => setKind('habit')}>{t('me.habit')}</Chip>
            <Chip on={kind === 'routine'} onClick={() => setKind('routine')}>{t('me.routine')}</Chip>
          </div>
        </div>
        {/* 时间=与今日任务同一只官方鼓轮（components/ui/TimeWheel）；空串=未设定 */}
        <TimeWheel
          value={time || null}
          onChange={(v) => setTime(v ?? '')}
          clearLabel={t('sheet.clearTime')}
          label={t('sheet.timeLabel')}
          hourLabel={t('sheet.hourCol')}
          minuteLabel={t('sheet.minuteCol')}
        />
        <Stepper label={t('sheet.durLabel')} value={durMin} onChange={setDurMin} min={1} max={600} step={5} fallback={25} unit={t('sheet.durUnit')} />
        <Field label={t('routine.subLabel')} value={sub} onChange={(e) => setSub(e.target.value)} />
        {goals.length > 0 && (
          <div className="tsheet__row tsheet__row--col">
            <span className="eyebrow">{t('sheet.goalLabel')}</span>
            <div className="tsheet__chips">
              <Chip on={goalId == null} onClick={() => setGoalId(null)}>{t('sheet.noneLabel')}</Chip>
              {goals.map((g) => <Chip key={g.id} on={goalId === g.id} onClick={() => setGoalId(g.id)}>{g.title}</Chip>)}
            </div>
          </div>
        )}
        {editing && (
          <div className="tsheet__row tsheet__row--col">
            <Button variant="danger-text" onClick={() => { archiveRoutine(routine.id); onClose() }}>{t('routine.archive')}</Button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
