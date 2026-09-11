import { useData } from './store'
import { schedulePush } from './sync'
import { dateKey, todayKey } from '@/lib/dates'
import type { Task, TaskTier, TaskStatus, InboxItem, Review, Direction, DataState, Goal, GoalStatus, Routine } from './types'

/**
 * 全 App 唯一数据写入口（actions）。
 * 规则：组件永远不直接 setState 改数据；所有「接受/生成」动作都落到这里，
 * 并触发防抖云同步。可逆性：删除=返回快照供 undo toast 恢复（4.2s 语义）。
 */

const now = (): string => new Date().toISOString()

export function uid(): string {
  const c = globalThis.crypto as Crypto | undefined
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/* ─────────────── 任务 ─────────────── */

export interface NewTaskInput {
  title: string
  tier?: TaskTier
  date?: string | null
  time?: string | null
  durMin?: number | null
  urgent?: boolean
  note?: string | null
  goalId?: string | null
  routineId?: string | null
  status?: TaskStatus
}

export function createTask(input: NewTaskInput): Task {
  const title = input.title.trim()
  const t: Task = {
    id: uid(),
    title,
    tier: input.tier ?? (input.time ? 'block' : 'anytime'),
    status: input.status ?? (input.date ? 'scheduled' : 'planned'),
    date: input.date ?? null,
    time: input.time ?? null,
    durMin: input.durMin ?? null,
    urgent: !!input.urgent,
    completedAt: null,
    note: input.note ?? null,
    goalId: input.goalId ?? null,
    routineId: input.routineId ?? null,
    createdAt: now(),
    updatedAt: now(),
  }
  useData.setState((s) => ({ tasks: [...s.tasks, t] }))
  schedulePush()
  return t
}

export function updateTask(id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>): void {
  useData.setState((s) => ({
    tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now() } : t)),
  }))
  schedulePush()
}

/** 完成/撤销完成（完成态=completedAt 落在今天；撤销仅对当日完成有效）。 */
export function toggleTask(id: string): void {
  const s = useData.getState()
  const t = s.tasks.find((x) => x.id === id)
  if (!t) return
  const today = todayKey()
  if (t.completedAt && dateKey(new Date(t.completedAt)) === today) {
    updateTask(id, { completedAt: null, status: t.date ? 'scheduled' : 'planned' })
  } else {
    updateTask(id, { completedAt: now(), status: 'completed' })
  }
}

/** 跳过≠完成（td-skip 说谎按钮的解耦裁决）：状态独立，不惩罚。 */
export function skipTask(id: string): void {
  updateTask(id, { status: 'skipped', completedAt: null })
}

export function unskipTask(id: string): void {
  const t = useData.getState().tasks.find((x) => x.id === id)
  if (!t) return
  updateTask(id, { status: t.date ? 'scheduled' : 'planned' })
}

/** 改期写真实日期（今天/明天/本周末/下周一由调用方换算）。 */
export function rescheduleTask(id: string, date: string | null): void {
  updateTask(id, { date, status: date ? 'scheduled' : 'planned' })
}

/** 删除返回快照供 undo；调用方用 toast action 调 restoreTask。 */
export function deleteTask(id: string): { item: Task; index: number } | null {
  const s = useData.getState()
  const index = s.tasks.findIndex((t) => t.id === id)
  if (index < 0) return null
  const item = s.tasks[index]
  useData.setState({ tasks: s.tasks.filter((t) => t.id !== id) })
  schedulePush()
  return { item, index }
}

export function restoreTask(item: Task, index: number): void {
  useData.setState((s) => {
    const tasks = [...s.tasks]
    tasks.splice(Math.min(index, tasks.length), 0, item)
    return { tasks }
  })
  schedulePush()
}

/* ─────────────── 收集箱 ─────────────── */

export function captureInbox(title: string, hint?: string | null, source = 'capture'): InboxItem | null {
  const clean = title.trim()
  if (!clean) return null
  const item: InboxItem = {
    id: uid(), title: clean, hint: hint ?? null, status: 'open',
    source, convertedTaskId: null, createdAt: now(),
  }
  useData.setState((s) => ({ inbox: [...s.inbox, item] }))
  schedulePush()
  return item
}

/** 收集箱项改期 → 生成真实任务（M1 裁决：改期即成任务）。 */
export function convertInboxItem(id: string, plan: { date: string | null; time?: string | null; durMin?: number | null }): Task | null {
  const s = useData.getState()
  const item = s.inbox.find((i) => i.id === id && i.status === 'open')
  if (!item) return null
  const task = createTask({
    title: item.title,
    tier: plan.time ? 'block' : 'anytime',
    date: plan.date,
    time: plan.time ?? null,
    durMin: plan.durMin ?? null,
    status: plan.date ? 'scheduled' : 'planned',
  })
  useData.setState({
    inbox: s.inbox.map((i) => (i.id === id ? { ...i, status: 'converted', convertedTaskId: task.id } : i)),
  })
  schedulePush()
  return task
}

export function reopenInboxItem(id: string): void {
  useData.setState((s) => ({
    inbox: s.inbox.map((i) => (i.id === id ? { ...i, status: 'open', convertedTaskId: null } : i)),
  }))
  schedulePush()
}

export function deleteInboxItem(id: string): { item: InboxItem; index: number } | null {
  const s = useData.getState()
  const index = s.inbox.findIndex((i) => i.id === id)
  if (index < 0) return null
  const item = s.inbox[index]
  useData.setState({ inbox: s.inbox.filter((i) => i.id !== id) })
  schedulePush()
  return { item, index }
}

export function restoreInboxItem(item: InboxItem, index: number): void {
  useData.setState((s) => {
    const inbox = [...s.inbox]
    inbox.splice(Math.min(index, inbox.length), 0, item)
    return { inbox }
  })
  schedulePush()
}

/* ─────────────── 习惯打卡 ─────────────── */

export function toggleHabit(routineId: string): void {
  const today = todayKey()
  const s = useData.getState()
  const existing = s.habitLogs.find((l) => l.routineId === routineId && l.date === today)
  if (existing) {
    useData.setState({ habitLogs: s.habitLogs.filter((l) => l.id !== existing.id) })
  } else {
    useData.setState({ habitLogs: [...s.habitLogs, { id: uid(), routineId, date: today, value: 1, createdAt: now() }] })
  }
  schedulePush()
}

/* ─────────────── 周复盘（可回填） ─────────────── */

export function saveReview(weekKeyStr: string, data: { wins: string; drained: string; oneThing: string }): void {
  const s = useData.getState()
  const prev = s.reviews[weekKeyStr]
  const review: Review = {
    weekKey: weekKeyStr,
    wins: data.wins, drained: data.drained, oneThing: data.oneThing,
    createdAt: prev?.createdAt ?? now(), updatedAt: now(),
  }
  useData.setState({ reviews: { ...s.reviews, [weekKeyStr]: review } })
  schedulePush()
  // oneThing → Inbox（唯一 Adjust 窄路；Phase 4 扩多通道）
  if (data.oneThing.trim() && prev?.oneThing !== data.oneThing) {
    captureInbox(data.oneThing, null, 'review_one_thing')
  }
}

/* ─────────────── Direction ─────────────── */

export function updateDirection(patch: Partial<Direction>): void {
  useData.setState((s) => ({ direction: { ...s.direction, ...patch } }))
  schedulePush()
}

/* ─────────────── Goal CRUD + 状态机（Phase 4 闭环补全） ─────────────── */

export interface NewGoalInput {
  title: string
  kicker?: string | null
  note?: string | null
  focus?: string | null
  next?: string | null
  ladder?: Goal['ladder']
}

export function createGoal(input: NewGoalInput): Goal | null {
  const title = input.title.trim()
  if (!title) return null
  const g: Goal = {
    id: uid(), title,
    kicker: input.kicker ?? 'Quarter',
    note: input.note ?? null, focus: input.focus ?? null, next: input.next ?? null,
    ladder: input.ladder ?? [], status: 'active',
    createdAt: now(), updatedAt: now(),
  }
  useData.setState((s) => ({ goals: [...s.goals, g] }))
  schedulePush()
  return g
}

export function updateGoal(id: string, patch: Partial<Omit<Goal, 'id' | 'createdAt'>>): void {
  useData.setState((s) => ({
    goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: now() } : g)),
  }))
  schedulePush()
}

/** 状态机迁移：active↔paused；终态 completed/archived。 */
export function setGoalStatus(id: string, status: GoalStatus): void {
  updateGoal(id, { status })
}

/* ─────────────── 例程 CRUD（Routines=定义，habit_logs=打卡） ─────────────── */

export interface NewRoutineInput {
  name: string
  sub?: string | null
  time?: string | null
  durMin?: number | null
  goalId?: string | null
  kind?: 'habit' | 'routine'
}

export function createRoutine(input: NewRoutineInput): Routine | null {
  const name = input.name.trim()
  if (!name) return null
  const r: Routine = {
    id: uid(), goalId: input.goalId ?? null, name,
    sub: input.sub ?? null, frequency: null,
    time: input.time ?? null, durMin: input.durMin ?? null,
    kind: input.kind ?? 'habit', archived: false,
    createdAt: now(), updatedAt: now(),
  }
  useData.setState((s) => ({ routines: [...s.routines, r] }))
  schedulePush()
  return r
}

export function updateRoutine(id: string, patch: Partial<Omit<Routine, 'id' | 'createdAt'>>): void {
  useData.setState((s) => ({
    routines: s.routines.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now() } : r)),
  }))
  schedulePush()
}

/** 归档=软删除（打卡历史保留，Today 习惯条/Me 列表不再出现）。 */
export function archiveRoutine(id: string): void {
  updateRoutine(id, { archived: true })
}

/* ─────────────── 健康（Demo 输入 + 可解释能量规则；真接入待原生层） ─────────────── */

/** 连接健康（当前=演示数据，明示 source:'demo'；真接入走 HealthKit/Health Connect）。 */
export function connectHealthDemo(): void {
  useData.setState({
    health: {
      connected: true,
      source: 'demo',
      today: { sleepHours: 6.3, usualSleep: 7.5, restingHR: 58, hrv: 48, steps: 6200 },
    },
  })
  schedulePush()
}

/** 断开健康：清空全部健康数据（UI 侧必须先确认）。 */
export function disconnectHealth(): void {
  useData.setState({ health: null })
  schedulePush()
}

/** 能量规则（第一版，简单可解释；不打分）：睡比常态少 1h 以上 → low。 */
export function energyOf(h: DataState['health']): 'low' | 'normal' {
  if (!h?.connected || !h.today) return 'normal'
  return h.today.sleepHours < h.today.usualSleep - 1 ? 'low' : 'normal'
}

/* ─────────────── 测试辅助 ─────────────── */

/** 测试专用：整体替换状态（persist 语义外的干净复位）。 */
export function __replaceStateForTests(state: DataState): void {
  useData.setState(state, true)
}
