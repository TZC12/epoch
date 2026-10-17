import { useData } from '@/services/store'
import { addDays, dateKey } from '@/lib/dates'
import { convertInboxItem, logHabit, reopenInboxItem, unlogHabit, updateTask } from '@/services/actions'

/* ═══════════════════════════════════════════════════════════════════
   Agent 提案模型 · 只出语义码，不出中文
   ───────────────────────────────────────────────────────────────────
   两条来自本项目既有规矩的硬约束：
   ① 引擎不写中文（见 [[epoch-data-copy-rules]]）：所有面向用户的字符串都是
      i18n key + vars，措辞在 lib/i18n.ts 里，换语言不用动这里。
   ② 提案直接写现有 slice（createTask/updateTask/logHabit/convertInboxItem），
      **不新建第二套"AI 数据"**。否则刷新一次就会看到"AI 说的"和"真的"对不上。

   数据结构照 LibreChat 的做法：一条 agent 输出 = parts（有序事件），
   每个工具调用带自己的状态，可折叠、可原地重试——这是"agent"和"聊天框"的分界。
   ═══════════════════════════════════════════════════════════════════ */

export type ProposalKind = 'review-now' | 'trim-today' | 'capture-to-today' | 'habit-carry'

export type StepStatus = 'pending' | 'running' | 'done' | 'failed'

export interface TraceStep {
  id: string
  /** 语义码：i18n 的 agent.step.* */
  labelKey: string
  status: StepStatus
  /** 真实耗时（ms），壳里用假时长但同样按序累计，界面形状与真接一致 */
  ms?: number
}

export interface Evidence {
  /** 来源徽标点开看到的字段：语义码 + 真值 */
  labelKey: string
  value: string | number
}

export interface Proposal {
  id: string
  kind: ProposalKind
  /** 一句话提案（i18n key + vars） */
  titleKey: string
  titleVars?: Record<string, string | number>
  /** 依据：为什么现在提这个 */
  reasonKey: string
  reasonVars?: Record<string, string | number>
  evidence: Evidence[]
  steps: TraceStep[]
  /** 采纳时要落地的真实参数——不落地就不算提案 */
  payload: ProposalPayload
}

export type ProposalPayload =
  | { kind: 'review-now'; wordIds: string[]; langId: string | null }
  | { kind: 'trim-today'; taskId: string; fromTier: 'main'; toTier: 'anytime' }
  | { kind: 'capture-to-today'; inboxId: string; taskId: string }
  | { kind: 'habit-carry'; routineId: string; date: string }

export interface ApplyResult {
  ok: boolean
  /** 撤销闭包：采纳必须可撤回，和全站"即时 + 撤销"的规矩一致 */
  undo?: () => void
  /** 失败时的语义码 */
  errorCode?: string
}

type S = ReturnType<typeof useData.getState>

/** 今天的主任务（date=null 视为今天/随时，与 useTodayTasks 同口径） */
function mainToday(s: S, today: string) {
  return s.tasks.filter(
    (t) => t.tier === 'main' && (t.status === 'planned' || t.status === 'scheduled') && (t.date === today || t.date === null),
  )
}

function dueWords(s: S, today: string) {
  const lang = s.learnActive ?? s.learnLangs[0]?.id ?? null
  if (!lang) return { lang, list: [] as S['learnWords'] }
  return { lang, list: s.learnWords.filter((w) => w.langId === lang && w.due <= today) }
}

/** 昨天没打、但近 3 天打过 → 连击还活着，提"今天补一次" */
function carryHabits(s: S, today: string) {
  const y = dateKey(addDays(new Date(today), -1))
  const recent = new Set([0, 1, 2].map((i) => dateKey(addDays(new Date(today), -i))))
  const logged = new Set(s.habitLogs.filter((l) => recent.has(l.date) && l.value > 0).map((l) => l.routineId))
  const doneYesterday = new Set(s.habitLogs.filter((l) => l.date === y && l.value > 0).map((l) => l.routineId))
  return s.routines.filter((r) => r.kind === 'habit' && !r.archived && !doneYesterday.has(r.id) && logged.has(r.id))
}

/**
 * 派生今日提案：纯函数，输入是真实 store 状态。
 * 顺序即优先级——首屏折叠线里只放得下 1 判断 + 1~2 卡，排在前面的必须最值钱。
 */
export function deriveProposals(today: string, suppressed: Set<string>): Proposal[] {
  const s = useData.getState()
  const out: Proposal[] = []

  const due = dueWords(s, today)
  if (due.list.length > 0 && !suppressed.has('review-now')) {
    const boxes = due.list.map((w) => w.box)
    out.push({
      id: `p-review-${today}`,
      kind: 'review-now',
      titleKey: 'agent.review.title',
      titleVars: { n: due.list.length },
      reasonKey: 'agent.review.reason',
      reasonVars: { oldest: Math.min(...boxes) },
      evidence: [
        { labelKey: 'agent.evidence.due', value: due.list.length },
        { labelKey: 'agent.evidence.boxLow', value: Math.min(...boxes) },
        { labelKey: 'agent.evidence.boxHigh', value: Math.max(...boxes) },
      ],
      steps: [
        { id: 'read', labelKey: 'agent.step.readDue', status: 'pending' },
        { id: 'sort', labelKey: 'agent.step.sortByBox', status: 'pending' },
        { id: 'cap', labelKey: 'agent.step.capSession', status: 'pending' },
      ],
      payload: { kind: 'review-now', wordIds: due.list.map((w) => w.id), langId: due.lang },
    })
  }

  const mains = mainToday(s, today)
  if (mains.length > 3 && !suppressed.has('trim-today')) {
    /* 和今天页既有的"有点重"守护同源（HomePage heavy = activeMains > 3），
       不另立阈值：两处判据不一致时用户会看到两套矛盾的建议 */
    const newest = [...mains].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]
    out.push({
      id: `p-trim-${newest.id}`,
      kind: 'trim-today',
      titleKey: 'agent.trim.title',
      titleVars: { title: newest.title },
      reasonKey: 'agent.trim.reason',
      reasonVars: { n: mains.length },
      evidence: [
        { labelKey: 'agent.evidence.mainToday', value: mains.length },
        { labelKey: 'agent.evidence.newest', value: newest.title },
      ],
      steps: [
        { id: 'count', labelKey: 'agent.step.countMain', status: 'pending' },
        { id: 'pick', labelKey: 'agent.step.pickNewest', status: 'pending' },
      ],
      payload: { kind: 'trim-today', taskId: newest.id, fromTier: 'main', toTier: 'anytime' },
    })
  }

  const open = s.inbox.filter((i) => i.status === 'open')
  if (open.length > 0 && mains.length <= 2 && !suppressed.has('capture-to-today')) {
    const item = open[open.length - 1]
    out.push({
      id: `p-capture-${item.id}`,
      kind: 'capture-to-today',
      titleKey: 'agent.capture.title',
      titleVars: { title: item.title },
      reasonKey: 'agent.capture.reason',
      reasonVars: { n: mains.length },
      evidence: [
        { labelKey: 'agent.evidence.inboxOpen', value: open.length },
        { labelKey: 'agent.evidence.mainToday', value: mains.length },
      ],
      steps: [
        { id: 'read', labelKey: 'agent.step.readInbox', status: 'pending' },
        { id: 'slot', labelKey: 'agent.step.findSlot', status: 'pending' },
      ],
      payload: { kind: 'capture-to-today', inboxId: item.id, taskId: '' },
    })
  }

  const carry = carryHabits(s, today)
  if (carry.length > 0 && !suppressed.has('habit-carry')) {
    const r = carry[0]
    out.push({
      id: `p-carry-${r.id}`,
      kind: 'habit-carry',
      titleKey: 'agent.carry.title',
      titleVars: { name: r.name },
      /* 这句是 Loop 那套"N 次/M 天 + 断签缓冲"语义的价值所在：
         漏一天不等于连击死掉，只要今天补上就还活着 */
      reasonKey: 'agent.carry.reason',
      evidence: [
        { labelKey: 'agent.evidence.missedYesterday', value: 1 },
        { labelKey: 'agent.evidence.recentDays', value: 3 },
      ],
      steps: [
        { id: 'scan', labelKey: 'agent.step.scanLogs', status: 'pending' },
        { id: 'check', labelKey: 'agent.step.checkStreak', status: 'pending' },
      ],
      payload: { kind: 'habit-carry', routineId: r.id, date: today },
    })
  }

  return out
}

/**
 * 采纳：写真实 slice，并返回撤销闭包。
 * ⚠ 这里读 store 一律用 getState() 现读——actions 是就地变异，
 *   渲染闭包里的数组可能是旧引用（首版滚动系统就栽过一次）。
 */
export function applyProposal(p: Proposal): ApplyResult {
  const s = useData.getState()
  /* 先取成局部 const：TS 只在判别属性保持「同一条引用」时才收窄，
     中间夹了函数调用后 p.payload.xxx 会退回联合类型（实测报 4 个错）。 */
  const pl = p.payload
  switch (pl.kind) {
    case 'trim-today': {
      const before = s.tasks.find((t) => t.id === pl.taskId)
      if (!before) return { ok: false, errorCode: 'agent.err.gone' }
      updateTask(before.id, { tier: 'anytime' })
      return { ok: true, undo: () => updateTask(before.id, { tier: before.tier }) }
    }
    case 'capture-to-today': {
      const item = s.inbox.find((i) => i.id === pl.inboxId)
      if (!item) return { ok: false, errorCode: 'agent.err.gone' }
      /* convertInboxItem 只会落成 anytime（它没有 tier 参数），所以转完再抬成 main——
         抬这一步就是"今天真的要做它"和"随手记一笔"的区别。 */
      const created = convertInboxItem(item.id, { date: null })
      if (!created) return { ok: false, errorCode: 'agent.err.gone' }
      updateTask(created.id, { tier: 'main' })
      return {
        ok: true,
        /* 撤销走公开 action（reopenInboxItem 会把状态与 convertedTaskId 一起还原），
           不要在这里手搓 setState——那会绕过 schedulePush，云侧留下脏数据 */
        undo: () => {
          updateTask(created.id, { status: 'cancelled' })
          reopenInboxItem(item.id)
        },
      }
    }
    case 'habit-carry': {
      const { routineId, date } = pl
      const had = s.habitLogs.some((l) => l.routineId === routineId && l.date === date && l.value > 0)
      if (had) return { ok: false, errorCode: 'agent.err.already' }
      logHabit(routineId, date)
      return { ok: true, undo: () => unlogHabit(routineId, date) }
    }
    case 'review-now':
      /* 复习不"写"数据——它的产物是打开复习卡组。真正的评分在卡组里逐词发生。
         所以这条的 apply 语义是"进入"，撤销=关掉，别在这里改 box/due。 */
      return { ok: true, undo: undefined }
    default:
      return { ok: false, errorCode: 'agent.err.unknown' }
  }
}

/* ── 拒绝即训练：同类被否两次就不再提 ── */
const PREF_KEY = 'epoch-agent-prefs'

export function readSuppressed(): Set<string> {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    if (!raw) return new Set()
    const obj = JSON.parse(raw) as Record<string, number>
    return new Set(Object.entries(obj).filter(([, n]) => n >= 2).map(([k]) => k))
  } catch {
    return new Set()
  }
}

export function recordRejection(kind: ProposalKind): void {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    const obj = (raw ? JSON.parse(raw) : {}) as Record<string, number>
    obj[kind] = (obj[kind] ?? 0) + 1
    localStorage.setItem(PREF_KEY, JSON.stringify(obj))
  } catch {
    /* 隐私模式/配额满：拒绝仍生效于本次会话，只是不跨会话记忆——不该打断用户 */
  }
}

export function rejectionCount(kind: ProposalKind): number {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    const obj = (raw ? JSON.parse(raw) : {}) as Record<string, number>
    return obj[kind] ?? 0
  } catch {
    return 0
  }
}
