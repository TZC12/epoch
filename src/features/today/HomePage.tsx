import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DateNavigator } from '@/components/DateNavigator'
import { DayProgress } from '@/components/ui/DayProgress'
import { WeatherCard } from '@/components/WeatherCard'
import { EventsReminder } from '@/components/EventsReminder'
import { TlRow } from '@/components/ui/TlRow'
import { EmptyState } from '@/components/ui/EmptyState'
import { Seg } from '@/components/ui/Seg'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { IconButton } from '@/components/ui/IconButton'
import { Plus } from 'lucide-react'
import { useSwipeReveal } from '@/components/ui/swipe'
import { useToast } from '@/components/ui/Toast'
import { TaskSheet, type SheetTarget } from './TaskSheet'
import { PlanMyDaySheet } from '@/features/plan/PlanMyDaySheet'
import { AISuggestSheet } from '@/features/ai/AISuggestSheet'
import { useData, isDoneToday } from '@/services/store'
import { useHabitsToday } from '@/services/queries'
import { HabitChip } from '@/components/ui/HabitChip'
import { Insight } from '@/components/ui/Insight'
import { rescheduleTask, updateTask, skipTask, toggleHabit } from '@/services/actions'
import { toggleTask, deleteTask, restoreTask, captureInbox, deleteInboxItem, restoreInboxItem, convertInboxItem } from '@/services/actions'
import { dateKey, todayKey, addDays } from '@/lib/dates'
import type { Task, InboxItem } from '@/services/types'
import './home.css'

type CardKey = 'tasks' | 'events' | 'inbox'
type TaskFilter = 'todo' | 'done' | 'anytime'

/** 严格未来的下一个星期几（0=周日）。 */
function nextWeekday(target: number): string {
  const d = new Date()
  let diff = (target - d.getDay() + 7) % 7
  if (diff === 0) diff = 7
  return dateKey(addDays(d, diff))
}

/** 收集箱行（复用左滑删除手势语义）。 */
function InboxRow({ item, deleteLabel, onOpen, onDelete }: {
  item: InboxItem; deleteLabel: string; onOpen: () => void; onDelete: () => void
}) {
  const sw = useSwipeReveal()
  const onBodyClick = (): void => {
    if (sw.justSwiped()) return
    if (sw.reveal) { sw.collapse(); return }
    onOpen()
  }
  return (
    <div className={`inbox-row tl-row ${sw.reveal ? 'tl-row--reveal' : ''}`}>
      <div className="tl-row__del-slot" aria-hidden={!sw.reveal}>
        <button type="button" className="tl-row__del" tabIndex={sw.reveal ? 0 : -1} onClick={onDelete}>{deleteLabel}</button>
      </div>
      <div ref={sw.innerRef} className={`tl-row__inner ${sw.dragging ? 'tl-row__inner--drag' : ''}`.trim()} {...sw.handlers}>
        <button type="button" className="inbox-row__body" onClick={onBodyClick}>
          <span className="tl-row__title t-small">{item.title}</span>
          {item.hint && <span className="tl-row__meta t-caption">{item.hint}</span>}
        </button>
      </div>
    </div>
  )
}

/**
 * 主页（图三/图四映射：Today + Plan 合并为执行+收集一体）：
 * 日期导航 → 日进度条（取代仪表盘）→ 天气+事件提醒（图二）→ 三卡切换
 * 【任务｜事件｜收集箱】——任务卡内含 待办/已完成/随时 三段（图四）；
 * 收集箱卡吸收原 Plan 全部能力（捕获/安排/规划今天/AI 分拣）。
 */
export default function HomePage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [selected, setSelected] = useState(todayKey())
  const [card, setCard] = useState<CardKey>('tasks')
  const [filter, setFilter] = useState<TaskFilter>('todo')
  const [sheetTarget, setSheetTarget] = useState<SheetTarget>(null)
  const [pmdOpen, setPmdOpen] = useState(false)
  const [aiSortOpen, setAiSortOpen] = useState(false)
  const [capture, setCapture] = useState('')
  const [planItem, setPlanItem] = useState<InboxItem | null>(null)
  const [planDate, setPlanDate] = useState<string | null>(null)
  const [planTime, setPlanTime] = useState<string | null>(null)

  const direction = useData((s) => s.direction)
  const tasksAll = useData((s) => s.tasks)
  const inboxAll = useData((s) => s.inbox)
  const goals = useData((s) => s.goals)

  const isToday = selected === todayKey()
  /* 所选日的任务集：date 为空的任务只在"今天"视图出现（随时区语义） */
  const dayTasks = useMemo(() => {
    return tasksAll
      .filter((x) => x.status !== 'cancelled' && (x.date === selected || (x.date == null && isToday)))
      .sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
  }, [tasksAll, selected, isToday])

  const inbox = inboxAll.filter((i) => i.status === 'open')
  const goalName = (goalId: string | null): string | null =>
    goalId ? (goals.find((g) => g.id === goalId)?.title ?? null) : null

  const onDelete = (task: Task): void => {
    const snap = deleteTask(task.id)
    if (snap) toast(t('common.deleted'), { action: { label: t('common.undo'), onClick: () => restoreTask(snap.item, snap.index) } })
  }

  const onCapture = (): void => {
    if (captureInbox(capture)) {
      setCapture('')
      toast(t('plan.captured'), { tone: 'success' })
    }
  }

  const onSavePlan = (): void => {
    if (!planItem) return
    if (convertInboxItem(planItem.id, { date: planDate, time: planTime })) toast(t('common.saved'), { tone: 'success' })
    setPlanItem(null)
  }

  const tomorrow = dateKey(addDays(new Date(), 1))

  /* 守护语义（自 legacy Today 迁入）：Main ≤3，超出给修复出口 */
  const activeMains = dayTasks.filter(
    (x) => x.tier === 'main' && !isDoneToday(x, x.date ?? todayKey()) && x.status !== 'skipped',
  )
  const heavy = isToday && activeMains.length > 3
  const newestMain = activeMains[activeMains.length - 1]

  /* 全完成时刻（spec：Everything is done.） */
  const allDone = isToday && dayTasks.length > 0 && dayTasks.every((x) => isDoneToday(x, x.date ?? todayKey()))

  const habitsToday = useHabitsToday()

  /* ── 任务卡内容（图四：待办/已完成/随时 三段） ── */
  const tasksCard = () => {
    const list = dayTasks.filter((x) => {
      const done = isDoneToday(x, x.date ?? todayKey())
      if (filter === 'todo') return !done && x.time != null
      if (filter === 'anytime') return !done && x.time == null
      return done
    })
    return (
      <>
        {heavy && newestMain && (
          <Insight
            title={t('today.heavy')}
            actions={
              <>
                <Button size="sm" variant="quiet" onClick={() => rescheduleTask(newestMain.id, tomorrow)}>{t('today.heavyMove')}</Button>
                <Button size="sm" variant="quiet" onClick={() => updateTask(newestMain.id, { tier: 'anytime' })}>{t('today.heavyReduce')}</Button>
                <Button size="sm" variant="quiet" onClick={() => skipTask(newestMain.id)}>{t('today.heavySkip')}</Button>
              </>
            }
          />
        )}
        <div className="home-card__filter">
          <Seg
            options={[
              { value: 'todo', label: t('home.fTodo') },
              { value: 'done', label: t('home.fDone') },
              { value: 'anytime', label: t('home.fAnytime') },
            ]}
            value={filter}
            onChange={(v) => setFilter(v as TaskFilter)}
            ariaLabel={t('home.tasksCard')}
          />
        </div>
        {allDone && filter === 'todo' ? (
          <EmptyState title={t('today.allDone')} sub={t('today.allDoneSub')} />
        ) : list.length === 0 ? (
          <EmptyState
            title={filter === 'done' ? t('home.emptyDone') : t('home.emptyTasks')}
            sub={!isToday ? t('home.futureHint') : undefined}
            action={isToday ? <Button variant="quiet" onClick={() => setSheetTarget('new')}>{t('today.addTask')}</Button> : undefined}
          />
        ) : (
          <div className="tl">
            {list.map((task) => (
              <TlRow
                key={task.id}
                title={task.title}
                time={task.time}
                duration={task.durMin}
                tier={task.tier}
                urgent={task.urgent}
                done={filter === 'done'}
                goal={goalName(task.goalId)}
                note={task.note}
                deleteLabel={t('common.delete')}
                onToggle={() => toggleTask(task.id)}
                onOpen={() => setSheetTarget(task)}
                onDelete={() => onDelete(task)}
              />
            ))}
          </div>
        )}
      </>
    )
  }

  /* ── 事件卡：所选日全天事件流（时间线形态） ── */
  const eventsCard = () => {
    const events = dayTasks.filter((x) => x.time != null)
    return events.length === 0 ? (
      <EmptyState title={t('home.emptyEvents')} sub={!isToday ? t('home.futureHint') : undefined} />
    ) : (
      <div className="tl">
        {events.map((task) => (
          <TlRow
            key={task.id}
            title={task.title}
            time={task.time}
            duration={task.durMin}
            tier={task.tier}
            urgent={task.urgent}
            done={isDoneToday(task, task.date ?? todayKey())}
            goal={goalName(task.goalId)}
            note={task.note}
            deleteLabel={t('common.delete')}
            onToggle={() => toggleTask(task.id)}
            onOpen={() => setSheetTarget(task)}
            onDelete={() => onDelete(task)}
          />
        ))}
      </div>
    )
  }

  /* ── 收集箱卡：原 Plan 全能力（捕获/行安排/规划今天/AI 分拣） ── */
  const inboxCard = () => (
    <>
      <input
        className="home-capture"
        value={capture}
        onChange={(e) => setCapture(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onCapture() }}
        placeholder={t('plan.capturePlaceholder')}
        aria-label={t('plan.inbox')}
      />
      <div className="home-card__pmd">
        <Button block variant="quiet" onClick={() => setPmdOpen(true)}>{t('today.planMyDay')}</Button>
        {inbox.length > 0 && <Button block variant="ghost" onClick={() => setAiSortOpen(true)}>{t('ai.inboxTitle')}</Button>}
      </div>
      {inbox.length === 0 ? (
        <EmptyState title={t('plan.nothing')} />
      ) : (
        <div className="tl">
          {inbox.map((item) => (
            <InboxRow
              key={item.id}
              item={item}
              deleteLabel={t('common.delete')}
              onOpen={() => { setPlanItem(item); setPlanDate(selected); setPlanTime(null) }}
              onDelete={() => {
                const snap = deleteInboxItem(item.id)
                if (snap) toast(t('common.deleted'), { action: { label: t('common.undo'), onClick: () => restoreInboxItem(snap.item, snap.index) } })
              }}
            />
          ))}
        </div>
      )}
    </>
  )

  return (
    <div>
      <DateNavigator selected={selected} onSelect={setSelected} />

      <div className="home-dayprog">
        <DayProgress wake={direction.wake ?? '07:00'} sleep={direction.sleep ?? '23:30'} />
      </div>

      <div className="home-widgets">
        {isToday && <WeatherCard />}
        {isToday && <EventsReminder tasks={dayTasks} onOpen={(x) => setSheetTarget(x)} />}
      </div>

      {/* 三卡切换（图三：点上方三个选择切换卡片）+ 常驻新建 */}
      <div className="home-cardnav">
        <nav className="home-cards seg" aria-label={t('nav.today')}>
          {([['tasks', t('home.tasksCard')], ['events', t('home.eventsCard')], ['inbox', t('plan.inbox')]] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={card === k}
              className={`seg__btn ${card === k ? 'on' : ''}`} onClick={() => setCard(k)}>
              {label}
            </button>
          ))}
        </nav>
        <IconButton icon={<Plus size={18} strokeWidth={1.8} aria-hidden="true" />} label={t('today.addTask')} onClick={() => setSheetTarget('new')} />
      </div>

      <section className="home-card" aria-label={t('nav.today')}>
        {card === 'tasks' ? tasksCard() : card === 'events' ? eventsCard() : inboxCard()}
      </section>

      {/* 习惯条（仅今天；打卡=日志） */}
      {isToday && habitsToday.length > 0 && (
        <>
          <h2 className="eyebrow sec-title">{t('today.habits')}</h2>
          <div className="habit-bar">
            {habitsToday.map(({ routine, done: habitDone }) => (
              <HabitChip
                key={routine.id}
                name={routine.name}
                sub={routine.sub ?? undefined}
                done={habitDone}
                onToggle={() => toggleHabit(routine.id)}
              />
            ))}
          </div>
        </>
      )}

      <TaskSheet
        target={sheetTarget}
        onClose={() => setSheetTarget(null)}
        onSaved={(created) => {
          /* 无时间的新任务落在"随时"段——自动切过去，避免默认待办视图看不见 */
          if (!created.time) { setCard('tasks'); setFilter('anytime') }
        }}
      />
      <PlanMyDaySheet open={pmdOpen} onClose={() => setPmdOpen(false)} />
      <AISuggestSheet ability="sort_inbox" open={aiSortOpen} onClose={() => setAiSortOpen(false)} title={t('ai.inboxTitle')} />

      {/* 收集箱行 → 安排 sheet */}
      <Sheet
        open={planItem != null}
        onClose={() => setPlanItem(null)}
        title={t('plan.planTitle')}
        footer={
          <div className="home-plansheet__acts">
            <Button variant="quiet" onClick={() => setPlanItem(null)}>{t('common.cancel')}</Button>
            <Button onClick={onSavePlan}>{t('plan.schedule')}</Button>
          </div>
        }
      >
        {planItem && (
          <div className="home-plansheet">
            <h2 className="t-h3">{planItem.title}</h2>
            <div className="home-chips">
              <Chip on={planDate === selected} onClick={() => setPlanDate(selected)}>{t('sheet.todayChip')}</Chip>
              <Chip on={planDate === tomorrow} onClick={() => setPlanDate(tomorrow)}>{t('sheet.tomorrowChip')}</Chip>
              <Chip on={planDate === nextWeekday(6)} onClick={() => setPlanDate(nextWeekday(6))}>{t('plan.thisWeekend')}</Chip>
              <Chip on={planDate === nextWeekday(1)} onClick={() => setPlanDate(nextWeekday(1))}>{t('plan.nextMonday')}</Chip>
            </div>
            <div className="home-chips">
              {['08:00', '10:00', '14:00', '16:00', '20:00'].map((tm) => (
                <Chip key={tm} on={planTime === tm} onClick={() => setPlanTime(planTime === tm ? null : tm)}>{tm}</Chip>
              ))}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
