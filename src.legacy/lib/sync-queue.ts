import type { CompletionAction } from '../types/db'
import { supabase } from './supabase'

export interface PendingOp {
  opId: string
  taskId: string
  action: CompletionAction
  occurredAt: string
  tries: number
  failed: boolean
}

export type SyncStatus = 'synced' | 'syncing' | 'error'

export type ApplyRpc = (op: PendingOp) => Promise<void>
type Listener = (status: SyncStatus, queue: PendingOp[]) => void

const STORAGE_KEY = 'pb.pending_ops'

function defaultStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

async function defaultApplyRpc(op: PendingOp): Promise<void> {
  const { error } = await supabase.rpc('apply_completion', {
    p_task_id: op.taskId,
    p_action: op.action,
    p_client_op_id: op.opId,
    p_occurred_at: op.occurredAt,
  })
  if (error) throw new Error(error.message)
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * 离线同步队列：
 * - 打卡/撤销先乐观更新 UI，操作进入本地队列后立即尝试上云
 * - 断网时保留在浏览器本地，恢复网络 / 重新聚焦 / 手动重试时按序重放
 * - client_op_id 唯一约束保证重放与重复点击幂等
 */
export class SyncQueue {
  private ops: PendingOp[] = []
  private flushing = false
  private listeners = new Set<Listener>()
  private applyRpc: ApplyRpc
  private storage: Storage | null
  private boundOnline = () => this.flush()
  private boundVisible = () => {
    if (document.visibilityState === 'visible') void this.flush()
  }

  constructor(applyRpc: ApplyRpc = defaultApplyRpc, storage: Storage | null = defaultStorage()) {
    this.applyRpc = applyRpc
    this.storage = storage
    this.load()
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.boundOnline)
      document.addEventListener('visibilitychange', this.boundVisible)
    }
  }

  private load() {
    if (!this.storage) return
    try {
      const raw = this.storage.getItem(STORAGE_KEY)
      if (raw) this.ops = JSON.parse(raw) as PendingOp[]
    } catch {
      this.ops = []
    }
  }

  private persist() {
    if (!this.storage) return
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.ops))
    } catch {
      // 存储失败时仍保留内存队列
    }
  }

  private notify() {
    const status = this.getStatus()
    const snapshot = [...this.ops]
    for (const fn of this.listeners) fn(status, snapshot)
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.getStatus(), [...this.ops])
    return () => {
      this.listeners.delete(fn)
    }
  }

  getStatus(): SyncStatus {
    if (this.ops.some((o) => o.failed)) return 'error'
    if (this.flushing || this.ops.length > 0) return 'syncing'
    return 'synced'
  }

  getQueue(): PendingOp[] {
    return [...this.ops]
  }

  /** 该任务是否有待同步操作（用于防重复点击） */
  hasPendingFor(taskId: string): boolean {
    return this.ops.some((o) => o.taskId === taskId)
  }

  enqueue(taskId: string, action: CompletionAction): PendingOp {
    const op: PendingOp = {
      opId: uuid(),
      taskId,
      action,
      occurredAt: new Date().toISOString(),
      tries: 0,
      failed: false,
    }
    this.ops.push(op)
    this.persist()
    this.notify()
    void this.flush()
    return op
  }

  async flush(): Promise<void> {
    if (this.flushing || this.ops.length === 0) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    this.flushing = true
    this.notify()
    try {
      while (this.ops.length > 0) {
        const op = this.ops[0]
        try {
          await this.applyRpc(op)
          this.ops.shift()
          this.persist()
          this.notify()
        } catch {
          op.tries += 1
          op.failed = true
          this.persist()
          this.notify()
          break // 保持顺序：失败即停止，等待重试
        }
      }
    } finally {
      this.flushing = false
      this.notify()
    }
  }

  retry(): void {
    for (const op of this.ops) op.failed = false
    this.persist()
    this.notify()
    void this.flush()
  }

  dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.boundOnline)
      document.removeEventListener('visibilitychange', this.boundVisible)
    }
    this.listeners.clear()
  }
}

export const syncQueue = new SyncQueue()
