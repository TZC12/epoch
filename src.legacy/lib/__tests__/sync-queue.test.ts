import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SyncQueue, type PendingOp } from '../sync-queue'

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  }
}

async function flushMicrotasks() {
  await new Promise((r) => setTimeout(r, 0))
}

describe('SyncQueue', () => {
  let storage: Storage
  let applied: PendingOp[]

  beforeEach(() => {
    storage = memoryStorage()
    applied = []
  })

  it('enqueue 后按序上云并清空队列', async () => {
    const q = new SyncQueue(
      async (op) => {
        applied.push(op)
      },
      storage,
    )
    q.enqueue('task-1', 'complete')
    q.enqueue('task-2', 'undo')
    await vi.waitFor(() => expect(q.getQueue()).toHaveLength(0))
    expect(applied.map((o) => [o.taskId, o.action])).toEqual([
      ['task-1', 'complete'],
      ['task-2', 'undo'],
    ])
    expect(q.getStatus()).toBe('synced')
  })

  it('失败时标记 failed 并停止，retry 后重放', async () => {
    let fail = true
    const q = new SyncQueue(
      async (op) => {
        if (fail) throw new Error('network down')
        applied.push(op)
      },
      storage,
    )
    q.enqueue('task-1', 'complete')
    await vi.waitFor(() => expect(q.getStatus()).toBe('error'))
    expect(q.getQueue()).toHaveLength(1)
    expect(q.getQueue()[0].tries).toBe(1)

    fail = false
    q.retry()
    await vi.waitFor(() => expect(q.getStatus()).toBe('synced'))
    expect(applied).toHaveLength(1)
  })

  it('持久化到 storage，重启后恢复队列', async () => {
    const q1 = new SyncQueue(
      async () => {
        throw new Error('offline')
      },
      storage,
    )
    q1.enqueue('task-1', 'complete')
    await vi.waitFor(() => expect(q1.getStatus()).toBe('error'))

    const q2 = new SyncQueue(
      async (op) => {
        applied.push(op)
      },
      storage,
    )
    expect(q2.getQueue()).toHaveLength(1)
    expect(q2.getQueue()[0].taskId).toBe('task-1')
    q2.flush()
    await vi.waitFor(() => expect(q2.getQueue()).toHaveLength(0))
    expect(applied).toHaveLength(1)
  })

  it('hasPendingFor 防重复入队', async () => {
    const q = new SyncQueue(
      async () => {
        // 模拟长时间未完成
        await new Promise((r) => setTimeout(r, 50))
      },
      storage,
    )
    q.enqueue('task-1', 'complete')
    expect(q.hasPendingFor('task-1')).toBe(true)
    expect(q.hasPendingFor('task-2')).toBe(false)
    await flushMicrotasks()
    q.dispose()
  })

  it('状态订阅通知', async () => {
    const q = new SyncQueue(
      async (op) => {
        applied.push(op)
      },
      storage,
    )
    const events: string[] = []
    q.subscribe((status) => events.push(status))
    q.enqueue('task-1', 'complete')
    await vi.waitFor(() => expect(q.getQueue()).toHaveLength(0))
    expect(events).toContain('synced')
  })
})
