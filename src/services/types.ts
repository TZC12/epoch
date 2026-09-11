/* ═══ 领域类型（与 0005_norm.sql 对齐；App 内 camelCase，同步层映射 snake_case） ═══ */

export type TaskTier = 'main' | 'block' | 'anytime'
export type TaskStatus = 'planned' | 'scheduled' | 'completed' | 'skipped' | 'cancelled'
export type GoalStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'
export type InboxStatus = 'open' | 'converted' | 'dismissed'

/** Direction 1─1 User（审计 §18）。 */
export interface Direction {
  statement: string
  domains: string[]
  wake: string | null
  sleep: string | null
  work: string | null
}

export interface GoalLadderStep {
  lv: string                     /* '3-Year' | '1-Year' | 'Quarter' | 'Month' | 'Week' */
  t: string
  cur: boolean
}

/** goals 不存 pct——永远由 tasks/habit_logs 派生（goalPct()）。 */
export interface Goal {
  id: string
  title: string
  kicker: string | null
  note: string | null
  focus: string | null
  next: string | null
  ladder: GoalLadderStep[]
  status: GoalStatus
  createdAt: string
  updatedAt: string
}

export interface Routine {
  id: string
  goalId: string | null
  name: string
  sub: string | null
  frequency: unknown | null
  time: string | null
  durMin: number | null
  kind: 'habit' | 'routine'
  archived: boolean
  createdAt: string
  updatedAt: string
}

/** 全 App 唯一任务存储。Event ≡ time ≠ null（显式定档，不建独立表）。 */
export interface Task {
  id: string
  title: string
  tier: TaskTier
  status: TaskStatus
  date: string | null            /* 'YYYY-MM-DD'；null ⇒ 今天/随时 */
  time: string | null            /* 'HH:MM' */
  durMin: number | null
  urgent: boolean
  completedAt: string | null     /* 打卡时刻；跨日复位=查询派生，无重置 hack */
  note: string | null
  goalId: string | null
  routineId: string | null
  createdAt: string
  updatedAt: string
}

/** 打卡=日志，非布尔翻转；unique(routineId, date)。 */
export interface HabitLog {
  id: string
  routineId: string
  date: string
  value: number
  createdAt: string
}

export interface InboxItem {
  id: string
  title: string
  hint: string | null
  status: InboxStatus
  source: string | null          /* 'capture' | 'review_one_thing' | 'ai' */
  convertedTaskId: string | null
  createdAt: string
}

/** 周复盘：unique(user, weekKey)——可回填，不再覆盖丢失。 */
export interface Review {
  weekKey: string                /* '2026-W37'（ISO 周，周一为始） */
  wins: string
  drained: string
  oneThing: string
  createdAt: string
  updatedAt: string
}

/** 跨日定格缓存 + legacy 导入落点（新数据由 rollover 写入；当日实时派生）。 */
export interface DayStat {
  done: number
  total: number
  urgent: boolean
}

/**
 * 健康接入（Phase 4）：读取身体数据回答「今天适合什么强度」，不做健康 Dashboard、不打分。
 * 真实接入需原生层（HealthKit/Health Connect）；此前一律 source='demo' 明示演示数据（审计 C6）。
 */
export interface HealthState {
  connected: boolean
  source: 'demo' | 'apple-health' | 'health-connect' | null
  today: {
    sleepHours: number
    usualSleep: number
    restingHR: number
    hrv: number
    steps: number
  } | null
}

export interface DataState {
  direction: Direction
  goals: Goal[]
  routines: Routine[]
  tasks: Task[]
  habitLogs: HabitLog[]
  inbox: InboxItem[]
  reviews: Record<string, Review>
  dayStats: Record<string, DayStat>
  health: HealthState | null
  lastDay: string | null
}
