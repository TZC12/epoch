import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '@/components/ui/Sheet'
import { Field } from '@/components/ui/Field'
import { Note } from '@/components/ui/Note'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { useToast } from '@/components/ui/Toast'
import { useFocus } from '@/features/focus/focusStore'
import { ChevronDown } from 'lucide-react'
import { createTask, updateTask, deleteTask, restoreTask, skipTask } from '@/services/actions'
import { useData } from '@/services/store'
import { todayKey, addDays, dateKey, WEEKDAY_ZH } from '@/lib/dates'
import type { Task, TaskTier } from '@/services/types'
import './task-sheet.css'

/** null=关闭；'new'=新建；Task=编辑 */
export type SheetTarget = Task | 'new' | null

const DUR_PRESETS = [15, 30, 45, 60]

function fmtShortDate(iso: string, zh: boolean): string {
  const d = new Date(`${iso}T12:00:00`)
  return zh ? `${d.getMonth() + 1}月${d.getDate()}日` : `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}`
}

/** 内联月历：周一起始、今日标记、选中 accent pill（对齐 legacy #dtp 裁决）。Plan 复用。 */
export function MonthGrid({ value, onChange }: { value: string | null; onChange: (d: string | null) => void }) {
  const { i18n } = useTranslation()
  const zh = i18n.language.startsWith('zh')
  const initial = value ? new Date(`${value}T12:00:00`) : new Date()
  const [cursor, setCursor] = useState({ y: initial.getFullYear(), m: initial.getMonth() })
  const today = todayKey()
  const monthTitle = new Date(cursor.y, cursor.m, 1).toLocaleDateString(zh ? 'zh-CN' : 'en-GB', { year: 'numeric', month: 'long' })
  const startPad = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array<null>(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.y, cursor.m, i + 1)),
  ]
  const wd = zh
    ? WEEKDAY_ZH
    : Array.from({ length: 7 }, (_, i) => new Date(2024, 0, i + 1).toLocaleDateString('en-GB', { weekday: 'short' }))

  return (
    <div className="dcal" role="group" aria-label="date picker">
      <div className="dcal__nav">
        <button type="button" className="dcal__navbtn" aria-label="prev" onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}>‹</button>
        <span className="dcal__month t-small">{monthTitle}</span>
        <button type="button" className="dcal__navbtn" aria-label="next" onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}>›</button>
      </div>
      <div className="dcal__grid" aria-hidden="true">
        {wd.map((w, i) => <span key={i} className="dcal__wd t-caption">{w}</span>)}
      </div>
      <div className="dcal__grid">
        {cells.map((d, i) => {
          if (!d) return <span key={`p${i}`} />
          const k = dateKey(d)
          const sel = value === k
          return (
            <button key={k} type="button" className={`dcal__day tnum ${sel ? 'on' : ''} ${k === today ? 'is-today' : ''}`} onClick={() => onChange(k)}>
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** 内联时间：双列（24h × 5min），点选即定值（对齐 legacy 滚轮裁决的简化实现）。 */
export function TimeWheel({ value, onChange, clearLabel }: { value: string | null; onChange: (v: string | null) => void; clearLabel: string }) {
  const { t } = useTranslation()
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))
  const selH = value ? value.slice(0, 2) : null
  const selM = value ? value.slice(3, 5) : null
  return (
    <div className="tpick" role="group" aria-label="time picker">
      <div className="tpick__cols">
        <div className="tpick__col no-scrollbar">
          {hours.map((h) => (
            <button key={h} type="button" className={`tpick__item tnum ${selH === h ? 'on' : ''}`} onClick={() => onChange(`${h}:${selM ?? '00'}`)}>{h}</button>
          ))}
        </div>
        <div className="tpick__col no-scrollbar">
          {minutes.map((m) => (
            <button key={m} type="button" className={`tpick__item tnum ${selM === m ? 'on' : ''}`} onClick={() => onChange(`${selH ?? '08'}:${m}`)}>{m}</button>
          ))}
        </div>
      </div>
      <Button size="sm" variant="ghost" onClick={() => onChange(null)}>{clearLabel || t('sheet.clearTime')}</Button>
    </div>
  )
}

export interface TaskSheetProps {
  target: SheetTarget
  onClose: () => void
  onSaved?: (task: Task) => void   /* 新建落库后回调（如：无时间任务自动切到"随时"段） */
}

/** sheet-task 全可编辑表单（标题/类型/紧急/时间/日期/时长/Goal/Routine/备注/保存）。 */
export function TaskSheet({ target, onClose, onSaved }: TaskSheetProps) {
  const open = target != null
  const task: Task | null = target != null && target !== 'new' ? target : null
  const editing = task != null
  const { t, i18n } = useTranslation()
  const zh = i18n.language.startsWith('zh')
  const { toast } = useToast()
  const focus = useFocus()
  // 注意：selector 必须返回稳定引用——先取原数组，filter 在组件层做（防无限重渲）
  const goalsAll = useData((s) => s.goals)
  const goals = goalsAll.filter((g) => g.status === 'active')

  const [title, setTitle] = useState('')
  const [tier, setTier] = useState<TaskTier>('block')
  const [urgent, setUrgent] = useState(false)
  const [time, setTime] = useState<string | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [durMin, setDurMin] = useState<number | null>(null)
  const [goalId, setGoalId] = useState<string | null>(null)
  const [routineId, setRoutineId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [picker, setPicker] = useState<'none' | 'time' | 'date'>('none')

  useEffect(() => {
    if (!open) return
    if (task) {
      setTitle(task.title)
      setTier(task.tier)
      setUrgent(task.urgent)
      setTime(task.time)
      setDate(task.date)
      setDurMin(task.durMin)
      setGoalId(task.goalId)
      setRoutineId(task.routineId)
      setNote(task.note ?? '')
    } else {
      setTitle('')
      setTier('block')
      setUrgent(false)
      setTime(null)
      setDate(null)
      setDurMin(null)
      setGoalId(null)
      setRoutineId(null)
      setNote('')
    }
    setPicker('none')
  }, [open, target, task])

  const onSave = (): void => {
    const clean = title.trim()
    if (!clean) return
    const patch = { title: clean, tier, urgent, time, date, durMin, note: note.trim() || null, goalId, routineId }
    if (task) {
      updateTask(task.id, { ...patch, status: task.completedAt ? 'completed' : (date ? 'scheduled' : 'planned') })
    } else {
      const created = createTask({ ...patch, status: date ? 'scheduled' : 'planned' })
      onSaved?.(created)
    }
    onClose()
  }

  const onDelete = (): void => {
    if (task) {
      const snap = deleteTask(task.id)
      if (snap) toast(t('common.deleted'), { action: { label: t('common.undo'), onClick: () => restoreTask(snap.item, snap.index) } })
    }
    onClose()
  }

  const onSkip = (): void => {
    if (task) skipTask(task.id)
    onClose()
  }

  const today = todayKey()
  const tomorrow = dateKey(addDays(new Date(), 1))

  return (
    <Sheet open={open} onClose={onClose} tall title={editing ? t('sheet.editTitle') : t('sheet.newTitle')}>
      <div className="tsheet">
        {/* G1 · Identity —— What am I doing? */}
        <section className="tsheet__group">
          <span className="eyebrow">{t('sheet.gIdentity')}</span>
          <Field
            aria-label={t('sheet.fieldTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('sheet.titlePlaceholder')}
            autoFocus
            className="tsheet__title"
          />
        </section>

        {/* G2 · Classification —— 重点/安排/随时 + 紧急 */}
        <section className="tsheet__group">
          <span className="eyebrow">{t('sheet.gClassification')}</span>
          <div className="tsheet__chips">
            <Chip on={tier === 'main'} onClick={() => setTier('main')} ariaLabel={t('sheet.tierMain')}>{t('sheet.tierMain')}</Chip>
            <Chip on={tier === 'block'} onClick={() => setTier('block')} ariaLabel={t('sheet.tierBlock')}>{t('sheet.tierBlock')}</Chip>
            <Chip on={tier === 'anytime'} onClick={() => setTier('anytime')} ariaLabel={t('sheet.tierAnytime')}>{t('sheet.tierAnytime')}</Chip>
            <Chip on={urgent} onClick={() => setUrgent(!urgent)} ariaLabel={t('sheet.urgent')}>{t('sheet.urgent')}</Chip>
          </div>
        </section>

        {/* G3 · Scheduling —— 日期/时间/时长 = 一个 Schedule Group（数据行，非按钮） */}
        <section className="tsheet__group">
          <span className="eyebrow">{t('sheet.gScheduling')}</span>
          <div className="trow-list">
            <button type="button" className={`trow ${date ? 'trow--set' : ''}`} onClick={() => setPicker((p) => (p === 'date' ? 'none' : 'date'))}>
              <span className="trow__label">{t('sheet.dateLabel')}</span>
              <span className="trow__value tnum">{date ? fmtShortDate(date, zh) : t('sheet.todayChip')}</span>
              <ChevronDown className={`trow__chev ${picker === 'date' ? 'open' : ''}`} size={16} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <button type="button" className={`trow ${time ? 'trow--set' : ''}`} onClick={() => setPicker((p) => (p === 'time' ? 'none' : 'time'))}>
              <span className="trow__label">{t('sheet.timeLabel')}</span>
              <span className="trow__value tnum">{time ?? '—'}</span>
              <ChevronDown className={`trow__chev ${picker === 'time' ? 'open' : ''}`} size={16} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <div className="trow trow--static">
              <span className="trow__label">{t('sheet.durLabel')}</span>
              <div className="trow__presets">
                {DUR_PRESETS.map((m) => (
                  <Chip key={m} on={durMin === m} onClick={() => setDurMin(durMin === m ? null : m)}>{m}</Chip>
                ))}
              </div>
            </div>
          </div>

          {picker === 'date' && (
            <div className="tsheet__date">
              <div className="tsheet__chips">
                <Chip on={date === today} onClick={() => setDate(today)}>{t('sheet.todayChip')}</Chip>
                <Chip on={date === tomorrow} onClick={() => setDate(tomorrow)}>{t('sheet.tomorrowChip')}</Chip>
                <Chip on={date == null} onClick={() => setDate(null)}>{t('sheet.clearDate')}</Chip>
              </div>
              <MonthGrid value={date} onChange={setDate} />
            </div>
          )}
          {picker === 'time' && <TimeWheel value={time} onChange={(v) => { setTime(v) }} clearLabel={t('sheet.clearTime')} />}
        </section>

        {/* G4 · Alignment —— 目标（Why does this task matter?）+ 备注 */}
        <section className="tsheet__group">
          <span className="eyebrow">{t('sheet.gAlignment')}</span>
          {goals.length > 0 && (
            <div className="tsheet__chips">
              <Chip on={goalId == null} onClick={() => setGoalId(null)}>{t('sheet.noneLabel')}</Chip>
              {goals.map((g) => (
                <Chip key={g.id} on={goalId === g.id} onClick={() => setGoalId(g.id)}>{g.title}</Chip>
              ))}
            </div>
          )}
          <Note label={t('sheet.noteLabel')} value={note} onChange={setNote} rows={2} placeholder="…" />
        </section>
      </div>

      <div className="tsheet__foot">
        {editing && (
          <Button
            variant="quiet"
            onClick={() => { if (task) { focus.start({ id: task.id, title: task.title, durMin: durMin ?? task.durMin }) } onClose() }}
          >
            {t('focus.start')}
          </Button>
        )}
        {editing && <Button variant="quiet" onClick={onSkip}>{t('common.skip')}</Button>}
        {editing && <Button variant="danger" onClick={onDelete}>{t('common.delete')}</Button>}
        <Button onClick={onSave} disabled={!title.trim()}>{t('common.save')}</Button>
      </div>
    </Sheet>
  )
}
