import { useData } from './store'
import { schedulePush } from './sync'
import { pruneFolders } from './folders'
import { dateKey, todayKey, addDaysKey } from '@/lib/dates'
import { parseWordImport } from '@/lib/word-import'
import { normalizeBaseUrl } from '@/lib/ai-provider'
import { scheduleLabel, type Schedule } from '@/lib/schedule'
import type { Task, TaskTier, TaskStatus, TaskCategory, InboxItem, Review, Direction, DataState, Goal, GoalStatus, Routine, FitSession, LearnLang, LearnEntry, LearnMode, LearnWord, AIConfig, NoteItem, NoteFolder, HealthDay, Profile } from './types'

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
  category?: TaskCategory | null
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
    category: input.category ?? null,
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

/** 记一次打卡到指定日期（可回填过去 / 预勾未来；自适应调度依赖任意日打卡）。 */
export function logHabit(routineId: string, date: string, value = 1): void {
  const s = useData.getState()
  const existing = s.habitLogs.find((l) => l.routineId === routineId && l.date === date)
  if (existing) {
    useData.setState({
      habitLogs: s.habitLogs.map((l) => (l.id === existing.id ? { ...l, value } : l)),
    })
  } else {
    useData.setState({ habitLogs: [...s.habitLogs, { id: uid(), routineId, date, value, createdAt: now() }] })
  }
  schedulePush()
}

/** 取消某日打卡（从历史删除）。 */
export function unlogHabit(routineId: string, date: string): void {
  const s = useData.getState()
  useData.setState({ habitLogs: s.habitLogs.filter((l) => !(l.routineId === routineId && l.date === date)) })
  schedulePush()
}

/** 今日打卡开关（Today 习惯条用；跨任意日请走 logHabit/unlogHabit）。 */
export function toggleHabit(routineId: string): void {
  const today = todayKey()
  const s = useData.getState()
  const existing = s.habitLogs.find((l) => l.routineId === routineId && l.date === today)
  if (existing) unlogHabit(routineId, today)
  else logHabit(routineId, today)
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

/* ─────────────── Profile（昵称/头像，刻意不入云同步） ─────────────── */

export const NICKNAME_MAX = 24

export function setProfile(patch: Partial<Profile>): void {
  useData.setState((s) => ({
    profile: {
      ...s.profile,
      ...(patch.nickname !== undefined ? { nickname: patch.nickname.trim().slice(0, NICKNAME_MAX) } : {}),
      ...(patch.avatar !== undefined ? { avatar: patch.avatar } : {}),
    },
  }))
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
  schedule?: Schedule | null
}

export function createRoutine(input: NewRoutineInput): Routine | null {
  const name = input.name.trim()
  if (!name) return null
  const r: Routine = {
    id: uid(), goalId: input.goalId ?? null, name,
    sub: input.sub ?? null, frequency: input.schedule ?? null,
    time: input.time ?? null, durMin: input.durMin ?? null,
    kind: input.kind ?? 'habit', archived: false,
    createdAt: now(), updatedAt: now(),
  }
  useData.setState((s) => ({ routines: [...s.routines, r] }))
  schedulePush()
  return r
}

/** 设置日程：写入 frequency，并把可读周期同步到 sub 副标题。 */
export function setRoutineSchedule(id: string, schedule: Schedule | null): void {
  updateRoutine(id, { frequency: schedule, sub: scheduleLabel(schedule) })
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

/* ─────────────── 健身（FitPage：今日训练 + 训练记录） ─────────────── */

/** 设置/替换今日训练课程（FIT_COURSES id；null=清除）。 */
export function setFitToday(courseId: string | null): void {
  useData.setState({ fitToday: courseId })
  schedulePush()
}

/** 完成一次训练：按分钟比例折算 kcal，追加到记录。 */
export function logFitSession(courseId: string, minutes: number, kcalPerMin: number, date: string = todayKey()): FitSession {
  const m = Math.max(1, Math.round(minutes))
  const s: FitSession = { id: uid(), courseId, date, minutes: m, kcal: Math.max(1, Math.round(m * kcalPerMin)), createdAt: now() }
  useData.setState((st) => ({ fitSessions: [...st.fitSessions, s] }))
  schedulePush()
  return s
}

/* ─────────────── 语言学习（LearnPage） ─────────────── */

/** 添加语言（同名去重）；首个语言自动成为当前语言。goal=每日目标词数。 */
export function addLearnLang(name: string, goal = 30): LearnLang | null {
  const clean = name.trim()
  if (!clean) return null
  const st = useData.getState()
  if (st.learnLangs.some((l) => l.name === clean)) return null
  const lang: LearnLang = { id: uid(), name: clean, goal: Math.max(5, Math.round(goal) || 30), createdAt: now() }
  useData.setState((s) => ({ learnLangs: [...s.learnLangs, lang], learnActive: s.learnActive ?? lang.id }))
  schedulePush()
  return lang
}

/** 移除语言：级联删除其学习记录与生词（UI 侧负责确认）。 */
export function removeLearnLang(id: string): void {
  useData.setState((s) => ({
    learnLangs: s.learnLangs.filter((l) => l.id !== id),
    learnEntries: s.learnEntries.filter((e) => e.langId !== id),
    learnWords: s.learnWords.filter((w) => w.langId !== id),
    learnActive: s.learnActive === id ? (s.learnLangs.find((l) => l.id !== id)?.id ?? null) : s.learnActive,
  }))
  schedulePush()
}

export function setLearnActive(id: string | null): void {
  useData.setState({ learnActive: id })
  schedulePush()
}

/** 记一条学习记录（背单词结算 / 训练计时结算共用）。 */
export function logLearn(langId: string, mode: LearnMode, words: number, minutes: number, date: string = todayKey()): LearnEntry {
  const e: LearnEntry = { id: uid(), langId, date, words: Math.max(0, Math.round(words)), minutes: Math.max(0, Math.round(minutes)), mode, createdAt: now() }
  useData.setState((s) => ({ learnEntries: [...s.learnEntries, e] }))
  schedulePush()
  return e
}

export function addLearnWord(langId: string, word: string, meaning: string): LearnWord | null {
  const w = word.trim(), m = meaning.trim()
  if (!w || !m) return null
  const item: LearnWord = { id: uid(), langId, word: w, meaning: m, example: null, tag: null, box: 1, due: todayKey(), source: 'manual', createdAt: now() }
  useData.setState((s) => ({ learnWords: [...s.learnWords, item] }))
  schedulePush()
  return item
}

export function deleteLearnWord(id: string): void {
  useData.setState((s) => ({ learnWords: s.learnWords.filter((w) => w.id !== id) }))
  schedulePush()
}

/* ── 词库导入 + Leitner 间隔复习 ── */

/** Leitner box 2–5 的复习间隔（天）；box1=当天未掌握，持续到期。 */
const BOX_INTERVAL = [0, 0, 1, 2, 4, 9]

/** 一键导入：解析文本（粘贴/CSV/JSON）→ 与现有词库按 word 去重（大小写不敏感）；fresh=新入库词，供导入后 AI 整理连招。 */
export function importWords(langId: string, raw: string): { added: number; skipped: number; invalid: number; fresh: LearnWord[] } {
  const { entries, invalid } = parseWordImport(raw)
  const s = useData.getState()
  const seen = new Set(s.learnWords.filter((w) => w.langId === langId).map((w) => w.word.toLowerCase()))
  const today = todayKey()
  const fresh: LearnWord[] = []
  let skipped = 0
  for (const e of entries) {
    const k = e.word.toLowerCase()
    if (seen.has(k)) { skipped += 1; continue }
    seen.add(k)
    fresh.push({ id: uid(), langId, word: e.word, meaning: e.meaning, example: e.example, tag: e.tag, box: 1, due: today, source: 'import', createdAt: now() })
  }
  if (fresh.length) {
    useData.setState((st) => ({ learnWords: [...st.learnWords, ...fresh] }))
    schedulePush()
  }
  return { added: fresh.length, skipped, invalid, fresh }
}

/** 复习打分：认识→box+1 并按新 box 排到期；不认识→回 box1，今天继续到期。 */
export function gradeWord(id: string, known: boolean, today: string = todayKey()): void {
  useData.setState((s) => ({
    learnWords: s.learnWords.map((w) => {
      if (w.id !== id) return w
      const box = known ? Math.min(5, (w.box || 1) + 1) : 1
      return { ...w, box, due: addDaysKey(today, BOX_INTERVAL[box] ?? 0) }
    }),
  }))
  schedulePush()
}

/** 应用 AI 整理补丁（按 word 匹配，只回填非空字段）。返回命中数。 */
export function applyWordPatches(patches: { word: string; meaning?: string; example?: string | null; tag?: string | null }[], langId: string): number {
  const byWord = new Map(patches.map((p) => [p.word.toLowerCase(), p]))
  let hit = 0
  useData.setState((s) => ({
    learnWords: s.learnWords.map((w) => {
      if (w.langId !== langId) return w
      const p = byWord.get(w.word.toLowerCase())
      if (!p) return w
      hit += 1
      return { ...w, meaning: p.meaning ?? w.meaning, example: p.example ?? w.example, tag: p.tag ?? w.tag }
    }),
  }))
  schedulePush()
  return hit
}

/** 用户自带 AI 接口配置；null=清除。仅本机存储，不云同步。 */
export function setAIConfig(cfg: AIConfig | null): void {
  useData.setState({ aiConfig: cfg ? { ...cfg, baseUrl: normalizeBaseUrl(cfg.baseUrl) } : null })
}

/* ─────────────── 备忘录（NotesPage） ─────────────── */

export interface NewNoteInput {
  title: string
  body?: string
  tags?: string[]
  pinned?: boolean
}

/** 标签规范化：去空白、丢空、按大小写不敏感去重，保序。 */
export function normalizeTags(tags: readonly string[] | undefined): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags ?? []) {
    const v = raw.trim().replace(/^#/, '')
    if (!v) continue
    const k = v.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(v)
  }
  return out
}

export function createNote(input: NewNoteInput): NoteItem | null {
  const title = input.title.trim()
  if (!title) return null
  const n: NoteItem = {
    id: uid(), title,
    body: input.body ?? '', tags: normalizeTags(input.tags), pinned: !!input.pinned, folderId: null,
    createdAt: now(), updatedAt: now(),
  }
  useData.setState((s) => ({ notes: [n, ...s.notes] }))
  schedulePush()
  return n
}

export function updateNote(id: string, patch: Partial<Omit<NoteItem, 'id' | 'createdAt'>>): void {
  useData.setState((s) => ({
    notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now() } : n)),
  }))
  schedulePush()
}

/** 删除返回快照供 undo；调用方用 toast action 调 restoreNote。 */
export function deleteNote(id: string): { item: NoteItem; index: number } | null {
  const s = useData.getState()
  const index = s.notes.findIndex((n) => n.id === id)
  if (index < 0) return null
  const item = s.notes[index]
  useData.setState({ notes: s.notes.filter((n) => n.id !== id) })
  schedulePush()
  return { item, index }
}

export function restoreNote(item: NoteItem, index: number): void {
  useData.setState((s) => {
    const notes = [...s.notes]
    notes.splice(Math.min(index, notes.length), 0, item)
    return { notes }
  })
  schedulePush()
}

/* ── 备忘文件夹：拖两张及以上卡片叠在一起即成组（NotesPage 的拖拽层调用） ── */

/**
 * 成组类操作的撤销凭据：直接记"操作前每张备忘在哪个文件夹 + 当时有哪些文件夹"。
 * 记全量映射而不是记增量，是因为合并可能同时改动多张卡与多个文件夹，
 * 增量撤销要处理的情况太多（少写一条就把用户数据搅乱），全量还原没有这类风险。
 */
export interface NotesGroupUndo {
  slots: { id: string; folderId: string | null }[]
  folders: NoteFolder[]
}

function groupSnapshot(): NotesGroupUndo {
  const s = useData.getState()
  return { slots: s.notes.map((n) => ({ id: n.id, folderId: n.folderId ?? null })), folders: [...s.noteFolders] }
}

/* pruneFolders 在 folders.ts：store migrate 与 sync 回填要用同一条阈值，不放这儿以免循环 import。 */

/**
 * 把 dragged 这一张卡丢到 target 上成组。返回撤销凭据；null=没发生任何变化。
 *
 * 语义只有一条：**只移动被拖的那一张**，落点那边优先。
 *  落点已在某夹 → 拖入者加入该夹（"我把它丢进这一堆"）；
 *  落点是散卡、拖入者有夹 → 落点加入拖入者的夹（拖入者是"这堆的代表"）；
 *  两边都散 → 新建，名字取落点那张（用户直觉是"以被丢到的那张为代表"）。
 * 拖入者若因此离开原夹，原夹掉到 1 个成员就由 pruneFolders 就地解散。
 */
export function mergeNotes(draggedId: string, targetId: string): NotesGroupUndo | null {
  const before = groupSnapshot()
  if (draggedId === targetId) return null
  let changed = false
  useData.setState((s) => {
    const a = s.notes.find((n) => n.id === draggedId)
    const b = s.notes.find((n) => n.id === targetId)
    if (!a || !b) return s
    const fa = a.folderId ?? null
    const fb = b.folderId ?? null
    if (fa && fa === fb) return s                    // 已在同一文件夹，无事发生

    const target = fb ?? fa ?? `fld_${uid()}`
    const folders = s.noteFolders.some((f) => f.id === target)
      ? s.noteFolders
      : [...s.noteFolders, { id: target, title: b.title, createdAt: now() }]
    const notes = s.notes.map((n) => {
      if (n.id !== draggedId && n.id !== targetId) return n
      if ((n.folderId ?? null) === target) return n
      changed = true
      return { ...n, folderId: target }
    })
    return pruneFolders({ ...s, notes, noteFolders: folders })
  })
  if (!changed) return null
  schedulePush()
  return before
}

/** 把一张卡从文件夹里拿出来（拖出到空白处、或展开层里点「移出」）。 */
export function ejectNote(noteId: string): NotesGroupUndo | null {
  const before = groupSnapshot()
  let changed = false
  useData.setState((s) => {
    const n = s.notes.find((x) => x.id === noteId)
    if (!n?.folderId) return s
    changed = true
    return pruneFolders({ ...s, notes: s.notes.map((x) => (x.id === noteId ? { ...x, folderId: null } : x)) })
  })
  if (!changed) return null
  schedulePush()
  return before
}

/** 整个文件夹摊回散卡。 */
export function dissolveFolder(folderId: string): NotesGroupUndo | null {
  const before = groupSnapshot()
  let changed = false
  useData.setState((s) => {
    if (!s.noteFolders.some((f) => f.id === folderId)) return s
    changed = true
    return {
      ...s,
      notes: s.notes.map((n) => (n.folderId === folderId ? { ...n, folderId: null } : n)),
      noteFolders: s.noteFolders.filter((f) => f.id !== folderId),
    }
  })
  if (!changed) return null
  schedulePush()
  return before
}

/** 撤销一次成组/移出/解散：按凭据把 folderId 与文件夹表整体还原。 */
export function undoGroup(undo: NotesGroupUndo): void {
  const slot = new Map(undo.slots.map((x) => [x.id, x.folderId]))
  const ids = new Set(undo.folders.map((f) => f.id))
  useData.setState((s) => ({
    noteFolders: undo.folders,
    notes: s.notes.map((n) => {
      if (!slot.has(n.id)) return n
      const folderId = slot.get(n.id) ?? null
      return { ...n, folderId: folderId && ids.has(folderId) ? folderId : null }
    }),
  }))
  schedulePush()
}

/* ─────────────── 健康日记（HealthPage：手动记录 + 能量语义联动） ─────────────── */

/** 写入某日身体记录；同时刷新 legacy health.today（usualSleep=历史均值），energyOf/AI 规划不断链。 */
export function saveHealthDay(date: string, d: HealthDay): void {
  useData.setState((s) => ({ healthDays: { ...s.healthDays, [date]: d } }))
  const st = useData.getState()
  const others = Object.entries(st.healthDays)
    .filter(([k, v]) => k !== date && v.sleepMin > 0)
    .map(([, v]) => v.sleepMin / 60)
  const usual = others.length > 0 ? others.reduce((a, b) => a + b, 0) / others.length : d.sleepMin / 60
  useData.setState({
    health: {
      connected: true,
      source: 'manual',
      today: { sleepHours: d.sleepMin / 60, usualSleep: Math.round(usual * 10) / 10, restingHR: d.restingHR, hrv: 0, steps: d.steps },
    },
  })
  schedulePush()
}

/* ─────────────── 测试辅助 ─────────────── */

/** 测试专用：整体替换状态（persist 语义外的干净复位）。 */
export function __replaceStateForTests(state: DataState): void {
  useData.setState(state, true)
}
