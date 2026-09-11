import { dateKey, todayKey } from '@/lib/dates'
import type { Task, Routine, InboxItem, Direction } from '@/services/types'

/**
 * Plan My Day 规则引擎（Phase 4：从固定模板假生成 → 读真实数据真生成）。
 *
 * 算法（固定块 + 间隙填充，全部可解释）：
 *  1. 可用窗 = [wake, sleep] 挖掉工作时段（direction.work '09:00-18:00'，可空）；
 *  2. 固定块 = 有时间的例程（引用，不落任务）+ 今天已排时间的任务（引用）；
 *  3. 每个可用窗内按固定块切出间隙，顺序填充：先「今天未安排时间的任务」（创建序），
 *     再「收集箱」（先到先排，默认 30min）；
 *  4. 低能量（健康 Demo 输入）时填充数上限 3。
 */

export interface Suggestion {
  key: string
  time: string          /* 'HH:MM' */
  title: string
  durMin: number
  source: 'routine' | 'task' | 'inbox'
  reason: string
  taskId?: string
  inboxId?: string
}

export interface FreeWindow { start: number; end: number } /* 分钟数 */

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const fmt = (min: number): string =>
  `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(Math.round(min) % 60).padStart(2, '0')}`

const clampDur = (min: number): number => Math.max(15, Math.min(min, 120))

export function parseWindows(direction: Direction): FreeWindow[] {
  const wake = toMin(direction.wake ?? '07:00')
  const sleep = toMin(direction.sleep ?? '23:30')
  const wins: FreeWindow[] = [{ start: wake, end: sleep }]
  const m = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec((direction.work ?? ''))
  if (m) {
    const ws = toMin(m[1]), we = toMin(m[2])
    const out: FreeWindow[] = []
    for (const w of wins) {
      if (we <= w.start || ws >= w.end) { out.push(w); continue }
      if (ws > w.start) out.push({ start: w.start, end: Math.min(ws, w.end) })
      if (we < w.end) out.push({ start: Math.max(we, w.start), end: w.end })
    }
    return out.filter((w) => w.end - w.start >= 30)
  }
  return wins
}

interface Block { start: number; end: number; s: Suggestion }

export interface PlanMyDayInput {
  direction: Direction
  tasks: Task[]
  routines: Routine[]
  inbox: InboxItem[]
  today?: string
  lowEnergy?: boolean
}

export function buildSuggestedDay(input: PlanMyDayInput): Suggestion[] {
  const today = input.today ?? todayKey()
  const wins = parseWindows(input.direction)
  if (wins.length === 0) return []

  /* 固定块：有时间的例程 + 今天已排时间的未完成任务 */
  const blocks: Block[] = []
  for (const r of input.routines.filter((r) => !r.archived && r.time)) {
    const start = toMin(r.time!)
    const dur = clampDur(r.durMin ?? 15)
    blocks.push({ start, end: start + dur, s: {
      key: `routine-${r.id}`, time: r.time!, title: r.name, durMin: dur,
      source: 'routine', reason: '固定例程',
    } })
  }
  for (const x of input.tasks.filter((x) =>
    x.status !== 'cancelled' && x.status !== 'completed' && x.status !== 'skipped' && x.date === today && x.time,
  )) {
    const start = toMin(x.time!)
    const dur = clampDur(x.durMin ?? 30)
    blocks.push({ start, end: start + dur, s: {
      key: `task-${x.id}`, time: x.time!, title: x.title, durMin: dur,
      source: 'task', reason: '已排', taskId: x.id,
    } })
  }
  blocks.sort((a, b) => a.start - b.start)

  /* 填充队列：随时任务（创建序）→ 收集箱（先到先排） */
  const queue: { title: string; durMin: number; ref: { taskId?: string; inboxId?: string } }[] = [
    ...input.tasks
      .filter((x) => x.status !== 'cancelled' && x.status !== 'completed' && x.status !== 'skipped' && (x.date == null || x.date === today) && !x.time)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((x) => ({ title: x.title, durMin: clampDur(x.durMin ?? 30), ref: { taskId: x.id } })),
    ...input.inbox.filter((i) => i.status === 'open').map((i) => ({ title: i.title, durMin: 30, ref: { inboxId: i.id } })),
  ]
  const cap = input.lowEnergy ? 3 : queue.length
  let filled = 0
  const out: Suggestion[] = []

  const fillGap = (from: number, to: number): number => {
    let at = from
    while (filled < cap && queue.length > 0) {
      const next = queue[0]
      if (at + next.durMin > to) break
      out.push({
        key: `fill-${next.ref.inboxId ?? next.ref.taskId}`, time: fmt(at), title: next.title,
        durMin: next.durMin, source: next.ref.inboxId ? 'inbox' : 'task',
        reason: next.ref.inboxId ? '来自收集箱' : '今天要做，还没定时间',
        ...next.ref,
      })
      queue.shift()
      filled += 1
      at += next.durMin
    }
    return at
  }

  for (const w of wins) {
    const inner = blocks.filter((b) => b.start >= w.start && b.end <= w.end)
    let at = w.start
    for (const b of inner) {
      at = fillGap(at, b.start)
      out.push(b.s)
      at = Math.max(at, b.end)
    }
    fillGap(at, w.end)
  }

  return out.sort((a, b) => a.time.localeCompare(b.time))
}

export const __planDayDateKey = dateKey
