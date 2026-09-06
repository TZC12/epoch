import type { PendingOp } from './sync-queue'
import type { DailyTask } from '../types/db'

/** 排序：先按时间（无时间靠后），再按 sort_order */
export function sortDailyTasks(tasks: DailyTask[]): DailyTask[] {
  return [...tasks].sort((a, b) => {
    const at = a.time_of_day ?? '99:99:99'
    const bt = b.time_of_day ?? '99:99:99'
    if (at !== bt) return at < bt ? -1 : 1
    return a.sort_order - b.sort_order
  })
}

/** 考虑本地待同步操作后的任务状态 */
export function effectiveStatus(task: DailyTask, queue: PendingOp[]): 'pending' | 'done' {
  const op = queue.find((o) => o.taskId === task.id)
  if (!op) return task.status
  return op.action === 'complete' ? 'done' : 'pending'
}

export function computeProgress(
  tasks: DailyTask[],
  queue: PendingOp[],
): { done: number; total: number } {
  const done = tasks.filter((t) => effectiveStatus(t, queue) === 'done').length
  return { done, total: tasks.length }
}

/** 下一项待完成任务（按时间顺序） */
export function computeNextTask(
  tasks: DailyTask[],
  queue: PendingOp[],
): DailyTask | null {
  const pending = sortDailyTasks(tasks).filter((t) => effectiveStatus(t, queue) === 'pending')
  return pending[0] ?? null
}

export function minimumStandardTasks(tasks: DailyTask[]): DailyTask[] {
  return tasks.filter((t) => t.is_minimum_standard)
}
