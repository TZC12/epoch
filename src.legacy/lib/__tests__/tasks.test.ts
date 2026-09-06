import { describe, expect, it } from 'vitest'
import { computeNextTask, computeProgress, effectiveStatus, sortDailyTasks } from '../tasks'
import type { DailyTask } from '../../types/db'
import type { PendingOp } from '../sync-queue'

function task(
  id: string,
  time: string | null,
  status: DailyTask['status'],
  sortOrder = 0,
): DailyTask {
  return {
    id,
    user_id: 'u1',
    task_date: '2026-08-22',
    template_id: null,
    title: `任务${id}`,
    time_of_day: time,
    category: 'rhythm',
    is_minimum_standard: false,
    notes: null,
    status,
    completed_at: null,
    sort_order: sortOrder,
  }
}

describe('tasks 纯函数', () => {
  it('sortDailyTasks：按时间升序，无时间靠后', () => {
    const sorted = sortDailyTasks([task('c', null, 'pending'), task('a', '08:00:00', 'done'), task('b', '06:40:00', 'pending')])
    expect(sorted.map((t) => t.id)).toEqual(['b', 'a', 'c'])
  })

  it('effectiveStatus：本地待同步操作覆盖服务端状态', () => {
    const t = task('a', '08:00:00', 'pending')
    const queue: PendingOp[] = [
      { opId: 'op1', taskId: 'a', action: 'complete', occurredAt: '2026-08-22T00:00:00Z', tries: 0, failed: false },
    ]
    expect(effectiveStatus(t, queue)).toBe('done')
  })

  it('computeProgress 统计含本地操作的进度', () => {
    const tasks = [task('a', '06:00:00', 'done'), task('b', '07:00:00', 'pending')]
    const queue: PendingOp[] = [
      { opId: 'op1', taskId: 'b', action: 'complete', occurredAt: '2026-08-22T00:00:00Z', tries: 0, failed: false },
    ]
    expect(computeProgress(tasks, queue)).toEqual({ done: 2, total: 2 })
  })

  it('computeNextTask 返回最早未完成任务', () => {
    const tasks = [task('a', '09:00:00', 'done'), task('b', '08:00:00', 'pending'), task('c', '07:00:00', 'done')]
    expect(computeNextTask(tasks, [])?.id).toBe('b')
  })

  it('全部完成时 computeNextTask 返回 null', () => {
    const tasks = [task('a', '09:00:00', 'done')]
    expect(computeNextTask(tasks, [])).toBeNull()
  })
})
