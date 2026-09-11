import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '@/components/ui/Sheet'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
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
        <Field label={t('routine.nameLabel')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('routine.namePlaceholder')} autoFocus />
        <div className="tsheet__row tsheet__row--col">
          <span className="eyebrow">{t('routine.kindLabel')}</span>
          <div className="tsheet__chips">
            <Chip on={kind === 'habit'} onClick={() => setKind('habit')}>{t('me.habit')}</Chip>
            <Chip on={kind === 'routine'} onClick={() => setKind('routine')}>{t('me.routine')}</Chip>
          </div>
        </div>
        <div className="gsheet__two">
          <Field label={t('sheet.timeLabel')} value={time} onChange={(e) => setTime(e.target.value)} placeholder="07:00" inputMode="numeric" />
          <Field label={t('sheet.durLabel')} value={durMin} onChange={(e) => setDurMin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
        </div>
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
