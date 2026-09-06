import { motion, type Variants } from 'motion/react'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import { useDailyTasks, useToggleTask } from '../hooks/useDailyTasks'
import { useDayThemes } from '../hooks/useTemplates'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { useMonthlyStats } from '../hooks/useMonthlyStats'
import { formatCnDate, formatTime, todayKey, dateKeyToWeekday } from '../lib/dates'
import { syncQueue } from '../lib/sync-queue'
import { toast } from '../lib/toast'
import {
  computeNextTask,
  computeProgress,
  minimumStandardTasks,
  sortDailyTasks,
} from '../lib/tasks'
import type { DailyTask } from '../types/db'
import { ActivityBarChart, type ActivityItem } from '../components/ActivityBarChart'
import { ArcGauge } from '../components/ArcGauge'
import { MinimalStandards } from '../components/MinimalStandards'
import { SyncBadge } from '../components/SyncBadge'
import { TaskTimeline } from '../components/TaskTimeline'
import { ThemeToggleButton } from '../components/ThemeToggleButton'
import { TimeProgress } from '../components/TimeProgress'
import { cardSx } from '../lib/cardSx'

const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] } },
}

/** 从月度统计中提取近 7 天完成率（仅统计有任务的日子） */
function toWeeklyActivity(stats: { dateKey: string; rate: number }[]): ActivityItem[] {
  return [...stats]
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(-7)
    .map((s) => {
      const label = s.dateKey.slice(5).replace('-', '/')
      const color: ActivityItem['color'] = s.rate >= 75 ? 'green' : s.rate > 0 ? 'dark' : 'muted'
      return { label, value: s.rate, color }
    })
}

export function TodayPage() {
  const dateKey = todayKey()
  const now = new Date()
  const { data: tasks = [], isLoading, isError, error, refetch } = useDailyTasks(dateKey)
  const { data: themes = [] } = useDayThemes()
  const { queue } = useSyncStatus()
  const toggle = useToggleTask(dateKey)
  const { data: monthlyStats = [] } = useMonthlyStats(now.getFullYear(), now.getMonth())

  const weekday = dateKeyToWeekday(dateKey)
  const theme = themes.find((t) => t.weekday === weekday)?.theme
  const sorted = sortDailyTasks(tasks)
  const next = computeNextTask(tasks, queue)
  const progress = computeProgress(tasks, queue)
  const minimums = minimumStandardTasks(sorted)
  const remaining = progress.total - progress.done
  const pct = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100)
  const weekly = toWeeklyActivity(monthlyStats)

  // 日程进度：首任务时间 → 末任务时间
  const firstTime = sorted[0]?.time_of_day?.slice(0, 5)
  const lastTime = sorted[sorted.length - 1]?.time_of_day?.slice(0, 5)

  const handleToggle = (task: DailyTask, nextDone: boolean) => {
    if (syncQueue.hasPendingFor(task.id)) {
      toast('该任务正在同步，请稍候', 'sync')
      return
    }
    toggle(task, nextDone)
  }

  return (
    <motion.div
      className="flex flex-col gap-4 px-4 pt-5"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.05 } },
      }}
    >
      {/* 顶部：日期 + 同步/主题 */}
      <motion.header variants={fadeVariants} className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-[var(--muted-foreground)]">今天</p>
          <h1 className="mt-0.5 text-[26px] font-bold leading-9 tracking-tight text-[var(--foreground)]">
            {formatCnDate(now)}
          </h1>
          {theme && (
            <span className="mt-1.5 inline-flex max-w-full items-center rounded-full bg-[var(--green-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--green-text)]">
              <span className="truncate">{theme}</span>
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <SyncBadge />
          <ThemeToggleButton />
        </div>
      </motion.header>

      {/* 今日进度：弧形仪表 */}
      <motion.div variants={fadeVariants}>
        <Paper elevation={0} sx={[cardSx, { p: 3 }]}>
          <div className="flex items-center gap-5">
            <ArcGauge
              value={pct}
              segments={[
                { value: pct, color: 'green', label: '已完成' },
                { value: 100 - pct, color: 'muted', label: '待完成' },
              ]}
              size={190}
              strokeWidth={16}
              headline={`${pct}%`}
              subhead={`${progress.done}/${progress.total} 项`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold tracking-wide text-[var(--muted-foreground)]">
                今日进度
              </p>
              <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
                {remaining > 0 ? `还剩 ${remaining} 项待完成` : '今日已全部完成'}
              </p>
              {next && (
                <Box
                  component="p"
                  sx={{
                    mt: 1.5,
                    fontSize: 13,
                    color: 'var(--muted-foreground)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                  }}
                >
                  <span className="inline-flex shrink-0 rounded-full bg-[var(--tw-overlay-2)] px-2 py-0.5 text-[11px] font-medium tabular-nums">
                    {formatTime(next.time_of_day) || '随时'}
                  </span>
                  <span className="truncate">{next.title}</span>
                </Box>
              )}
            </div>
          </div>
          {firstTime && lastTime && (
            <div className="mt-4">
              <TimeProgress start={firstTime} end={lastTime} now={now} />
            </div>
          )}
        </Paper>
      </motion.div>

      {/* 最低标准 */}
      <motion.div variants={fadeVariants}>
        <MinimalStandards tasks={minimums} queue={queue} />
      </motion.div>

      {/* 任务时间线 */}
      <motion.div variants={fadeVariants}>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="tw-skeleton h-16 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <section className="glass-card rounded-2xl border border-[var(--tw-border-l1)] bg-[var(--red-accent-soft)] p-5 text-center">
            <p className="text-sm font-medium text-[var(--red-text)]">加载失败：{error.message}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-[var(--primary-foreground)] active:opacity-70"
            >
              重试
            </button>
          </section>
        ) : (
          <TaskTimeline tasks={tasks} queue={queue} onToggle={handleToggle} />
        )}
      </motion.div>

      {/* 近 7 天完成率 */}
      {weekly.length > 0 && (
        <motion.div variants={fadeVariants}>
          <ActivityBarChart
            title="近 7 天完成率"
            subtitle="每日 SOP 任务完成百分比（绿色 = 达标 ≥75%）"
            items={weekly}
          />
        </motion.div>
      )}
    </motion.div>
  )
}
