import { Suspense, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SquarePen, CalendarDays, ChartNoAxesColumn } from 'lucide-react'
import { LiquidFab } from '@/components/ui/LiquidFab'
import { ReelCounter } from '@/components/ui/ReelCounter'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Insight } from '@/components/ui/Insight'
import { HabitChip } from '@/components/ui/HabitChip'
import { TipGroup } from '@/components/ui/Tooltip'
import { TlRowList } from '@/components/ui/TlRow'
import { Dropdown, ddTriggerProps } from '@/components/ui/Dropdown'
import { PhysicsConfetti } from '@/components/ui/PhysicsConfetti'
import { useToast } from '@/components/ui/Toast'
import { LoaderBar } from '@/components/ui/Feedback'
import { TaskSheet, type SheetTarget } from './TaskSheet'
import { lazy } from 'react'
/* PlanMyDaySheet：「安排我的一天」二级流程，点开才需要。
   TaskSheet 保持同步加载——它是「点任务行 → 编辑」的核心路径，
   做成异步会把最高频交互从同步变异步（首点要等 chunk），属体验回归。 */
const PlanMyDaySheet = lazy(() => import('@/features/plan/PlanMyDaySheet').then(m => ({ default: m.PlanMyDaySheet })))
import { useData, isDoneToday } from '@/services/store'
import { useHabitsToday, useHealthToday, useFitToday, useLearnToday } from '@/services/queries'
import { toggleTask, deleteTask, restoreTask, rescheduleTask, updateTask, skipTask, toggleHabit } from '@/services/actions'
import { useWeather, wmoIcon, wmoLabel } from '@/lib/weather-ui'
import { dateKey, todayKey, addDays } from '@/lib/dates'
import type { Task } from '@/services/types'
import './home.css'

/**
 * Today（概念稿 page1：今日总览）：眉题行（TODAY·日期 + 天气 + 进展入口）→
 * 大标题 + 问候 → SELF-DISCIPLINE hero（老虎机百分比，CTA→Plan）→
 * MODULES 四卡（计划/健康/健身/学习，真实派生数据，跳对应页）→
 * 今日任务（右侧完成勾选 + 左滑删除，≤5 条 + 查看全部）→ 习惯条 → FAB/sheets。
 * 收集箱区块已按用户要求撤下（数据层保留：备忘页与 AI 整理仍可用）。
 */
export default function HomePage() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [sheetTarget, setSheetTarget] = useState<SheetTarget>(null)
  const [pmdOpen, setPmdOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [burst, setBurst] = useState(0)
  const [ddPos, setDdPos] = useState<{ top: number; left: number } | null>(null)
  const ctaRef = useRef<HTMLButtonElement | null>(null)
  const heroRef = useRef<HTMLElement | null>(null)

  const today = todayKey()
  const tasksAll = useData((s) => s.tasks)
  const goals = useData((s) => s.goals)
  const weather = useWeather()
  const zh = i18n.language.startsWith('zh')

  const dayTasks = useMemo(() => {
    return tasksAll
      .filter((x) => x.status !== 'cancelled' && (x.date === today || (x.date == null)))
      .sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
  }, [tasksAll, today])

  const goalName = (goalId: string | null): string | null =>
    goalId ? (goals.find((g) => g.id === goalId)?.title ?? null) : null

  /* 守护语义：Main ≤3 */
  const activeMains = dayTasks.filter(
    (x) => x.tier === 'main' && !isDoneToday(x, x.date ?? today) && x.status !== 'skipped',
  )
  const heavy = activeMains.length > 3
  const newestMain = activeMains[activeMains.length - 1]
  const habitsToday = useHabitsToday()

  /* 自律进度：今日「任务 + 到期习惯」的完成比（hero 卡与计划模块共用）。 */
  const selfDiscipline = useMemo(() => {
    const tDone = dayTasks.filter((x) => isDoneToday(x, x.date ?? today)).length
    const hDone = habitsToday.filter((h) => h.done).length
    const total = dayTasks.length + habitsToday.length
    const done = tDone + hDone
    return { pct: total ? Math.round((done / total) * 100) : 0, done, total, tDone }
  }, [dayTasks, habitsToday, today])

  const healthToday = useHealthToday()
  const fitToday = useFitToday()
  const learnToday = useLearnToday()

  const pendingTasks = useMemo(
    () => dayTasks.filter((x) => !isDoneToday(x, x.date ?? today) && x.status !== 'skipped'),
    [dayTasks, today],
  )

  /* hero CTA 弹卡时间轴：今天任务按时间序，done=实心点 / skipped=虚点 / 待办=空心点 */
  const timeline = useMemo(
    () => dayTasks.map((x) => ({ task: x, done: isDoneToday(x, x.date ?? today) })),
    [dayTasks, today],
  )

  const onDelete = (task: Task): void => {
    const snap = deleteTask(task.id)
    if (snap) toast(t('common.deleted'), { action: { label: t('common.undo'), onClick: () => restoreTask(snap.item, snap.index) } })
  }

  /**
   * 清屏判定。⚠ 必须 getState() 现读：toggleTask 就地变异条目（persist 浅合并），
   * 渲染闭包里的 tasksAll 数组在事件处理器内是旧引用，判定会漏发。
   */
  const allClear = (): boolean => {
    const list = useData.getState().tasks.filter((x) => x.status !== 'cancelled' && (x.date === today || x.date == null))
    return list.length > 0 && list.every((x) => isDoneToday(x, x.date ?? today) || x.status === 'skipped')
  }
  const celebrateIfCleared = (wasAllClear: boolean): boolean => {
    if (wasAllClear || !allClear()) return false
    setBurst((n) => n + 1)
    return true
  }

  /**
   * 勾选完成：给真实反馈 + 撤销。撤销 = 再 toggle 一次（toggleTask 是纯开关，天然可逆）。
   * 勾掉最后一个 → PhysicsConfetti 爆发 + 清屏文案 toast（仍带撤销）。
   */
  const onToggleTask = (task: Task): void => {
    const wasDone = isDoneToday(task, task.date ?? today)
    const wasAllClear = allClear()
    toggleTask(task.id)
    if (!wasDone) {
      const undo = { action: { label: t('common.undo'), onClick: () => toggleTask(task.id) } }
      if (celebrateIfCleared(wasAllClear)) toast(t('today.allDone'), { tone: 'success', ...undo })
      else toast(t('common.completed'), { tone: 'success', ...undo })
    }
  }

  const onToggleHabit = (routineId: string): void => {
    const wasAllClear = allClear()
    toggleHabit(routineId)
    celebrateIfCleared(wasAllClear)
  }

  const heavyBlock = heavy && newestMain ? (
    <Insight
      title={t('today.heavy')}
      actions={
        <>
          <Button size="sm" variant="quiet" onClick={() => rescheduleTask(newestMain.id, dateKey(addDays(new Date(), 1)))}>{t('today.heavyMove')}</Button>
          <Button size="sm" variant="quiet" onClick={() => updateTask(newestMain.id, { tier: 'anytime' })}>{t('today.heavyReduce')}</Button>
          <Button size="sm" variant="quiet" onClick={() => skipTask(newestMain.id)}>{t('today.heavySkip')}</Button>
        </>
      }
    />
  ) : null

  /* 眉题日期：TODAY · 9月21日 周日 */
  const now = new Date()
  const dateLabel = zh
    ? `${now.getMonth() + 1}月${now.getDate()}日 周${'日一二三四五六'[now.getDay()]}`
    : now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })

  /* 动态欢迎语（按时段） */
  const h = now.getHours()
  const gKey = h < 5 ? 'gEvening' : h < 9 ? 'gMorning' : h < 12 ? 'gForenoon' : h < 18 ? 'gAfternoon' : 'gEvening'
  const greeting = t(`today.${gKey}`)

  const weatherInline = weather ? (
    <span className="home-weather" title={t('weather.source')}>
      {(() => { const WIcon = wmoIcon(weather.current.code); return <WIcon size={14} aria-hidden="true" /> })()}
      <span className="tnum">{weather.current.temp}°</span>
      <span className="home-weather__desc">{wmoLabel(weather.current.code, zh)}</span>
    </span>
  ) : null

  /* 计划/健身/学习已从底部导航撤下——MODULES 卡是唯一入口，
     悬停气泡（TipGroup，一点一组、之间滑行）补足"点进去是什么"。 */
  const modules = [
    { to: '/plan', label: t('modules.plan'), tip: t('modules.tipPlan'), value: `${selfDiscipline.tDone}/${dayTasks.length}`, unit: t('modules.planUnit') },
    { to: '/health', label: t('modules.health'), tip: t('modules.tipHealth'), value: healthToday.day ? String(healthToday.score) : '—', unit: healthToday.day ? t('modules.healthUnit') : '' },
    { to: '/fit', label: t('modules.fit'), tip: t('modules.tipFit'), value: String(fitToday.doneKcal), unit: t('modules.fitUnit') },
    { to: '/learn', label: t('modules.learn'), tip: t('modules.tipLearn'), value: String(learnToday.words), unit: t('modules.learnUnit') },
  ]

  return (
    <div className="home">
      <header className="home-head">
        <div className="home-head__col">
          <div className="eyebrow home-head__eyebrow">
            <span>{t('today.eyebrow')} · {dateLabel}</span>
            {weatherInline}
          </div>
          <h1 className="t-h1 home-head__title">{t('today.overview')}</h1>
          <p className="t-small home-head__greeting">{greeting}</p>
        </div>
        <div className="home-head__acts">
          <IconButton icon={<ChartNoAxesColumn size={20} aria-hidden="true" />} label={t('nav.progress')} onClick={() => { void navigate('/progress') }} />
        </div>
      </header>

      <section className="sd-hero" ref={heroRef} aria-label={t('today.selfDiscipline')}>
        <div className="sd-hero__body">
          <span className="eyebrow sd-hero__eyebrow">{t('today.heroLabel')}</span>
          <div className="sd-hero__num">
            <ReelCounter value={selfDiscipline.pct} className="sd-hero__reel" />
            <span className="sd-hero__pct">%</span>
          </div>
          <div className="sd-hero__sub">
            {t('today.heroSub')} · {selfDiscipline.done}/{selfDiscipline.total}
          </div>
          <button className="sd-hero__cta" {...ddTriggerProps(planOpen, () => {
            if (!planOpen && heroRef.current) {
              const h = heroRef.current.getBoundingClientRect()
              setDdPos({ top: Math.round(h.top + 12), left: Math.round(h.left + h.width / 2) })
            }
            setPlanOpen((v) => !v)
          }, (el) => { ctaRef.current = el })}>
            {t('today.heroCta')}
          </button>
          <Dropdown open={planOpen} onClose={() => setPlanOpen(false)} label={t('today.timelineTitle')} className="plan-dd" trigger={ctaRef.current} pos={ddPos}>
            <p className="eyebrow plan-dd__title">{t('today.timelineTitle')}</p>
            {timeline.length === 0 ? (
              <p className="plan-dd__empty">{t('today.timelineEmpty')}</p>
            ) : (
              <ol className="plan-dd__tl">
                {timeline.map(({ task, done }) => (
                  <li key={task.id} className={`plan-dd__item${done ? ' is-done' : ''}${task.status === 'skipped' ? ' is-skipped' : ''}`}>
                    <time className="plan-dd__time tnum" dateTime={task.date ?? today}>{task.time ?? '—'}</time>
                    <span className="plan-dd__lane" aria-hidden="true"><span className="plan-dd__dot" /></span>
                    <span className="plan-dd__name">{task.title}</span>
                  </li>
                ))}
              </ol>
            )}
            <Link to="/plan" className="plan-dd__all" onClick={() => setPlanOpen(false)}>{t('today.viewAll')} →</Link>
          </Dropdown>
        </div>
      </section>

      {/* MODULES 四卡（真实派生数据 → 各功能页） */}
      <section className="home-mods-sec" aria-label={t('modules.title')}>
        <h2 className="eyebrow home-sec-title">{t('modules.title')}</h2>
        <TipGroup className="home-mods tip-group--grid">
          {modules.map((m) => (
            <Link key={m.to} to={m.to} className="home-mod" data-tip={m.tip}>
              <span className="home-mod__label t-caption">{m.label}</span>
              <span className="home-mod__num tnum">{m.value}<span className="home-mod__unit">{m.unit}</span></span>
            </Link>
          ))}
        </TipGroup>
      </section>

      {/* 今日任务（右勾选 + 左滑删除，≤5 条 + 查看全部） */}
      <section className="home-tasks-sec" aria-label={t('today.tasksTitle')}>
        <div className="home-sec-head">
          <h2 className="eyebrow">{t('today.tasksTitle')}</h2>
          <Link to="/plan" className="home-sec-head__all">{t('today.viewAll')}</Link>
        </div>
        {heavyBlock}
        {dayTasks.length === 0 ? (
          <EmptyState
            title={t('today.clear')}
            action={<Button variant="quiet" onClick={() => setSheetTarget('new')}>{t('today.addTask')}</Button>}
          />
        ) : pendingTasks.length === 0 ? (
          <EmptyState title={t('today.allDone')} sub={t('today.allDoneSub')} />
        ) : (
          <div className="tl">
            <TlRowList
              rows={pendingTasks.slice(0, 5).map((task) => ({
                id: task.id,
                title: task.title,
                time: task.time,
                urgent: task.urgent,
                goal: [goalName(task.goalId), task.category ? t(`cats.${task.category}`) : null].filter(Boolean).join(' · ') || null,
                deleteLabel: t('common.delete'),
                onToggle: () => onToggleTask(task),
                onOpen: () => setSheetTarget(task),
                onDelete: () => onDelete(task),
              }))}
            />
          </div>
        )}
        <div className="home-card__pmd">
          <Button block variant="quiet" onClick={() => setPmdOpen(true)}>{t('today.planMyDay')}</Button>
        </div>
      </section>

      {/* 习惯条 */}
      {habitsToday.length > 0 && (
        <section aria-label={t('today.habits')}>
          <h2 className="eyebrow home-sec-title">{t('today.habits')}</h2>
          <div className="habit-bar">
            {habitsToday.map(({ routine, done: habitDone, status, streak }) => (
              <HabitChip
                key={routine.id}
                name={routine.name}
                sub={routine.sub ?? undefined}
                done={habitDone}
                streak={streak}
                backlog={status === 'backlog'}
                onToggle={() => onToggleHabit(routine.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 常驻新建：液体融合 FAB（共用组件，计划页同款）。
          菜单首项用 SquarePen 不用 Plus：中心钮本身就是加号（展开时旋转 45° 成 ×），
          子项再放一个加号就是两个加号叠在一起；"写一条任务"也确实是书写而不是加法。 */}
      <LiquidFab menuLabel={t('today.fabMenu')} items={[
        { key: 'new', label: t('today.addTask'), icon: <SquarePen size={18} aria-hidden="true" />, onClick: () => setSheetTarget('new') },
        { key: 'pmd', label: t('today.planMyDay'), icon: <CalendarDays size={18} aria-hidden="true" />, onClick: () => setPmdOpen(true) },
      ]} />

      <TaskSheet
        target={sheetTarget}
        onClose={() => setSheetTarget(null)}
        onSaved={() => undefined}
      />
      {pmdOpen && (
        <Suspense fallback={<LoaderBar />}>
          <PlanMyDaySheet open onClose={() => setPmdOpen(false)} />
        </Suspense>
      )}
      {/* 全部完成的物理事件：一次性彩带爆发（burst 计数自增即发射） */}
      <PhysicsConfetti burst={burst} />
    </div>
  )
}
