/* ═══ 领域类型（与 0005_norm.sql 对齐；App 内 camelCase，同步层映射 snake_case） ═══ */

import type { Schedule } from '@/lib/schedule'

export type TaskTier = 'main' | 'block' | 'anytime'
export type TaskStatus = 'planned' | 'scheduled' | 'completed' | 'skipped' | 'cancelled'
export type TaskCategory = 'work' | 'life' | 'study' | 'mind'
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
  frequency: Schedule | null     // 自适应日程；null（旧数据）按「每天」处理
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
  category: TaskCategory | null  /* Plan 页类别筛选（工作/生活/学习/心理） */
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
 * 手动记录（HealthPage 表单）→ source='manual'；energyOf/AI 规划沿用同一字段。
 */
export interface HealthState {
  connected: boolean
  source: 'demo' | 'manual' | 'apple-health' | 'health-connect' | null
  today: {
    sleepHours: number
    usualSleep: number
    restingHR: number
    hrv: number
    steps: number
  } | null
}

/** 健身：一次完成的训练（课程目录是常量，不落库）。 */
export interface FitSession {
  id: string
  courseId: string
  date: string                 /* 'YYYY-MM-DD' */
  minutes: number
  kcal: number
  createdAt: string
}

export type LearnMode = 'words' | 'listening' | 'speaking' | 'grammar'

export interface LearnLang {
  id: string
  name: string                 /* '英语' | '日语' | …（自定义同名去重） */
  goal: number                 /* 每日目标（词） */
  createdAt: string
}

export interface LearnEntry {
  id: string
  langId: string
  date: string
  words: number
  minutes: number
  mode: LearnMode
  createdAt: string
}

/**
 * 词库条目。SRS=Leitner box（1–5）；due=下次到期日（dateKey，<=今天即应复习）。
 * example/tag 可由 AI 整理回填；source 记录来源（手工/导入/AI 建议）。
 */
export interface LearnWord {
  id: string
  langId: string
  word: string
  meaning: string
  example: string | null
  tag: string | null
  box: number
  due: string
  source: 'manual' | 'import' | 'ai'
  createdAt: string
}

/** 用户自带的 OpenAI 兼容接口（仅存本机 localStorage，浏览器直连）。 */
export interface AIConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export interface NoteItem {
  id: string
  title: string
  body: string
  tags: string[]               /* Token Field 多标签；空数组 = 未分类 */
  pinned: boolean
  /**
   * 所属备忘文件夹 id；null=散卡。
   * 本机专属：云端 notes 表没有这一列，push 刻意不带（见 sync.ts 的保留位说明），
   * 因此换设备回填后备忘会回到散卡状态——这是有意降级，不是丢数据。
   */
  folderId: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 备忘文件夹：由"两张及以上卡片拖到一起"生成。
 * 成员关系不在这里存，而在 NoteItem.folderId 上——少于 2 个成员时由 actions 立刻删掉本条，
 * 所以界面上永远不会出现空文件夹。
 */
export interface NoteFolder {
  id: string
  title: string
  createdAt: string
}

/** 某日的身体记录（HealthPage 表单写入；score 由 lib/health-score 派生，不落库）。 */
export interface HealthDay {
  steps: number
  restingHR: number
  sleepMin: number
  deepMin: number
  weight: number
}

/** 自我呈现：昵称 + 自选头像（data URL，本机存储，不入云）。 */
export interface Profile {
  nickname: string
  avatar: string | null
}

export interface DataState {
  direction: Direction
  profile: Profile
  goals: Goal[]
  routines: Routine[]
  tasks: Task[]
  habitLogs: HabitLog[]
  inbox: InboxItem[]
  reviews: Record<string, Review>
  dayStats: Record<string, DayStat>
  health: HealthState | null
  fitSessions: FitSession[]
  fitToday: string | null        /* 今日训练课程 id（FIT_COURSES） */
  learnLangs: LearnLang[]
  learnActive: string | null     /* 当前语言 id */
  learnEntries: LearnEntry[]
  learnWords: LearnWord[]        /* 用户自建词库（内置词库见 services/learn-bank） */
  aiConfig: AIConfig | null      /* 用户自带 AI 接口（本机存储，不入云） */
  notes: NoteItem[]
  noteFolders: NoteFolder[]   /* 备忘文件夹（本机专属，成员关系在 note.folderId 上） */
  healthDays: Record<string, HealthDay>
  lastDay: string | null
}
