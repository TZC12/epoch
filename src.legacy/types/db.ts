export type Category = 'rhythm' | 'exercise' | 'study' | 'supplement' | 'skincare' | 'review'
export type TaskStatus = 'pending' | 'done'
export type CompletionAction = 'complete' | 'undo'

/** 每周 SOP 任务模板（可编辑，改动只影响未来日期） */
export interface RoutineTemplate {
  id: string
  user_id: string
  title: string
  time_of_day: string | null // 'HH:MM:SS'
  category: Category
  weekdays: number[] // 0=周一 … 6=周日
  is_minimum_standard: boolean
  notes: string | null
  enabled: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/** 每日「当日主题」 */
export interface DayTheme {
  user_id: string
  weekday: number
  theme: string
}

/** 某日实际执行的任务快照（模板改动不回写） */
export interface DailyTask {
  id: string
  user_id: string
  task_date: string // 'YYYY-MM-DD'
  template_id: string | null
  title: string
  time_of_day: string | null
  category: Category
  is_minimum_standard: boolean
  notes: string | null
  status: TaskStatus
  completed_at: string | null
  sort_order: number
}

/** 打卡操作日志（追加式，client_op_id 保证幂等） */
export interface TaskCompletion {
  id: number
  user_id: string
  task_id: string
  action: CompletionAction
  client_op_id: string
  occurred_at: string
  created_at: string
}

/** 个人设置 */
export interface UserSettings {
  user_id: string
  timezone: string
  locale: string
  holiday_region: string
  notifications: Record<string, unknown>
  data_version: number
  template_seed_version: number
}
