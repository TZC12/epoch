import { lazy, Suspense, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, SquarePen, CalendarDays } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { LiquidFab } from '@/components/ui/LiquidFab'
import { TlRowList } from '@/components/ui/TlRow'
import { useToast } from '@/components/ui/Toast'
import { TaskSheet, type SheetTarget } from '@/features/today/TaskSheet'
import { useData, isDoneToday } from '@/services/store'
import { addDaysKey, parseKey, rangeKeys, todayKey, weekdayIndex, WEEKDAY_ZH } from '@/lib/dates'
import { deleteTask, restoreTask, updateTask } from '@/services/actions'
import type { Task, TaskCategory } from '@/services/types'

const PlanMyDaySheet = lazy(() => import('./PlanMyDaySheet').then((m) => ({ default: m.PlanMyDaySheet })))
import '@/features/today/home.css'
import './plan-page.css'

type Cat = 'all' | TaskCategory
const CATS: Cat[] = ['all', 'work', 'life', 'study', 'mind']

/** 时间块分组（概念稿 page2：凌晨/上午/下午/晚上/随时）。 */
function blockOf(task: Task): 'night' | 'morning' | 'afternoon' | 'evening' | 'anytime' {
  if (!task.time) return 'anytime'
  const h = Number(task.time.slice(0, 2))
  if (h < 6) return 'night'
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

const BLOCK_ORDER = ['night', 'morning', 'afternoon', 'evening', 'anytime'] as const

export default function PlanPage() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const zh = i18n.language.startsWith('zh')
  const today = todayKey()
  const [selected, setSelected] = useState(today)
  const [cat, setCat] = useState<Cat>('all')
  const [sheetTarget, setSheetTarget] = useState<SheetTarget>(null)
  const [pmdOpen, setPmdOpen] = useState(false)

  const tasksAll = useData((s) => s.tasks)

  /* 周条：选中日所在周（周一起始），逐日任务数打点 */
  const weekDays = useMemo(() => {
    const monday = addDaysKey(selected, -weekdayIndex(selected))
    return rangeKeys(monday, addDaysKey(monday, 6)).map((key) => {
      const d = parseKey(key)
      const count = tasksAll.filter((x) => x.date === key).length
      return {
        key,
        dayNum: d.getDate(),
        label: zh ? WEEKDAY_ZH[weekdayIndex(key)] : d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        count,
        isToday: key === today,
        isSelected: key === selected,
      }
    })
  }, [selected, tasksAll, today, zh])

  /* 计划页=设定层：停用（cancelled）的行保留展示，只是开关关掉 */
  const dayTasks = useMemo(() => tasksAll
    .filter((x) => (x.date === selected || (x.date == null && selected === today)))
    .filter((x) => cat === 'all' || x.category === cat)
    .sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99')),
  [tasksAll, selected, cat, today])

  const doneCount = dayTasks.filter((x) => isDoneToday(x, selected)).length

  const groups = useMemo(() => {
    const m = new Map<string, Task[]>()
    for (const task of dayTasks) {
      const b = blockOf(task)
      const arr = m.get(b)
      if (arr) arr.push(task); else m.set(b, [task])
    }
    return BLOCK_ORDER.filter((b) => m.has(b)).map((b) => ({ block: b, tasks: m.get(b)! }))
  }, [dayTasks])

  /* 计划页行=设定：开关切换启用/停用（停用=从今日清单撤出，行本身保留；恢复为 planned） */
  const onEnable = (task: Task): void => {
    const on = task.status !== 'cancelled'
    updateTask(task.id, { status: on ? 'cancelled' : 'planned' })
    toast(on ? t('plan.disabled') : t('plan.enabled'), { tone: 'info' })
  }
  const onDelete = (task: Task): void => {
    const snap = deleteTask(task.id)
    if (snap) toast(t('common.deleted'), { action: { label: t('common.undo'), onClick: () => restoreTask(snap.item, snap.index) } })
  }

  const shiftWeek = (n: number): void => setSelected((s) => addDaysKey(s, n * 7))
  const selDate = parseKey(selected)

  return (
    <div className="plan">
      <header className="home-head">
        <div className="home-head__col">
          <span className="eyebrow">{t('plan.eyebrow')} · {zh ? `${selDate.getMonth() + 1}月` : selDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <h1 className="t-h1">{t('plan.overview')}</h1>
        </div>
        <div className="home-head__acts">
          <IconButton icon={<ChevronLeft size={20} aria-hidden="true" />} label="‹" onClick={() => shiftWeek(-1)} />
          <IconButton icon={<ChevronRight size={20} aria-hidden="true" />} label="›" onClick={() => shiftWeek(1)} />
        </div>
      </header>

      {/* 周条（7 天，打点=当日任务数） */}
      <div className="plan-week no-scrollbar" role="tablist" aria-label={t('plan.eyebrow')}>
        {weekDays.map((d) => (
          <button
            key={d.key}
            type="button"
            role="tab"
            aria-selected={d.isSelected}
            className={`plan-day ${d.isSelected ? 'plan-day--on' : ''} ${d.isToday ? 'plan-day--today' : ''}`}
            onClick={() => setSelected(d.key)}
          >
            <span className="plan-day__wd t-caption">{d.label}</span>
            <span className="plan-day__num tnum">{d.dayNum}</span>
            <span className="plan-day__dots" aria-hidden="true">
              {d.count > 0 && <i />}
              {d.count > 2 && <i />}
            </span>
          </button>
        ))}
      </div>

      {/* 类别筛选 chips */}
      <div className="plan-cats">
        {CATS.map((c) => (
          <Chip key={c} on={cat === c} onClick={() => setCat(c)}>{c === 'all' ? t('cats.all') : t(`cats.${c}`)}</Chip>
        ))}
      </div>

      <div className="plan-count t-caption tnum">{t('plan.doneCount', { done: doneCount, total: dayTasks.length })}</div>

      {dayTasks.length === 0 ? (
        <EmptyState
          title={t('plan.dayEmpty')}
          action={<Button variant="quiet" onClick={() => setSheetTarget('new')}>{t('today.addTask')}</Button>}
        />
      ) : (
        <div className="plan-blocks">
          {groups.map(({ block, tasks }) => (
            <section key={block} className="plan-block">
              <h2 className="eyebrow plan-block__title">
                {t(`plan.b${block[0].toUpperCase()}${block.slice(1)}`)}
                <span className="plan-block__count tnum">{tasks.length}</span>
              </h2>
              <div className="tl">
                <TlRowList
                  rows={tasks.map((task) => ({
                    id: task.id,
                    title: task.title,
                    time: task.time,
                    urgent: task.urgent,
                    toggleKind: 'switch' as const,
                    done: task.status !== 'cancelled',
                    goal: task.category ? t(`cats.${task.category}`) : null,
                    deleteLabel: t('common.delete'),
                    onToggle: () => onEnable(task),
                    onOpen: () => setSheetTarget(task),
                    onDelete: () => onDelete(task),
                  }))}
                />
              </div>
            </section>
          ))}
        </div>
      )}

      <LiquidFab menuLabel={t('today.fabMenu')} items={[
        { key: 'new', label: t('today.addTask'), icon: <SquarePen size={18} aria-hidden="true" />, onClick: () => setSheetTarget('new') },
        { key: 'pmd', label: t('today.planMyDay'), icon: <CalendarDays size={18} aria-hidden="true" />, onClick: () => setPmdOpen(true) },
      ]} />

      <TaskSheet target={sheetTarget} onClose={() => setSheetTarget(null)} initialDate={selected} />
      {pmdOpen && (
        <Suspense fallback={null}>
          <PlanMyDaySheet open onClose={() => setPmdOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}
