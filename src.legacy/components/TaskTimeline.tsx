import type { PendingOp } from '../lib/sync-queue'
import { effectiveStatus, sortDailyTasks } from '../lib/tasks'
import type { DailyTask } from '../types/db'
import { TaskRow } from './TaskRow'

interface Props {
  tasks: DailyTask[]
  queue: PendingOp[]
  onToggle: (task: DailyTask, nextDone: boolean) => void
}

export function TaskTimeline({ tasks, queue, onToggle }: Props) {
  const sorted = sortDailyTasks(tasks)

  if (sorted.length === 0) {
    return (
      <section className="glass-card rounded-2xl p-8 text-center">
        <p className="text-sm font-medium text-[var(--foreground)]">今日暂无任务</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">到「计划」页为这个星期几添加模板</p>
      </section>
    )
  }

  return (
    <section
      aria-label="今日任务列表"
      className="glass-card overflow-hidden rounded-2xl"
    >
      <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">今日任务</h2>
        <span className="rounded-full bg-[var(--tw-overlay-2)] px-2 py-0.5 text-[11px] font-medium tabular-nums text-[var(--muted-foreground)]">
          共 {sorted.length} 项
        </span>
      </div>
      <ul className="mt-1">
        {sorted.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            done={effectiveStatus(t, queue) === 'done'}
            disabled={queue.some((o) => o.taskId === t.id)}
            onToggle={onToggle}
          />
        ))}
      </ul>
    </section>
  )
}
