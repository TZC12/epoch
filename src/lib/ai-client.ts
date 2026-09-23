import { useData, goalPct, isDoneToday, tasksForDay } from '@/services/store'
import { dateKey, todayKey, addDays } from '@/lib/dates'
import { energyOf } from '@/services/actions'
import { chatCompletion, isConfigured, extractJsonObject } from '@/lib/ai-provider'
import { aiResponseSchema, type AIAbility, type AIProposalDTO, type AIContextDTO } from '@/shared/ai-schema'
import i18n from '@/lib/i18n'

/**
 * AI 前端客户端：真实上下文序列化 → 用户自带 OpenAI 兼容接口（ai-provider）→ zod 校验。
 * 拒绝记忆：被拒建议（type+title）本地记录，再次生成时过滤——不再重复建议（审计 §22）。
 */

const REJECT_KEY = 'epoch-ai-rejected'

function rejectedKeys(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(REJECT_KEY) ?? '[]') as string[]) } catch { return new Set() }
}

export function rememberRejected(p: { type: string; title: string }): void {
  try {
    const set = rejectedKeys()
    set.add(key(p.type, p.title))
    localStorage.setItem(REJECT_KEY, JSON.stringify([...set].slice(-100)))
  } catch { /* ignore */ }
}

const key = (type: string, title: string): string => `${type}::${title.trim()}`

export function buildAIContext(): AIContextDTO {
  const s = useData.getState()
  const today = todayKey()
  const goals = s.goals.filter((g) => g.status === 'active').slice(0, 10).map((g) => ({
    id: g.id, title: g.title, kicker: g.kicker, status: g.status,
    pct: goalPct(g.id, s.tasks, s.habitLogs, s.routines),
  }))
  return {
    lang: i18n.language.startsWith('zh') ? 'zh' : 'en',
    today,
    direction: { statement: s.direction.statement, wake: s.direction.wake, sleep: s.direction.sleep, work: s.direction.work },
    goals,
    todayTasks: tasksForDay(s.tasks, today).slice(0, 20).map((t) => ({
      id: t.id, title: t.title, time: t.time, durMin: t.durMin, tier: t.tier,
      done: isDoneToday(t, t.date ?? dateKey(new Date())),
    })),
    inbox: s.inbox.filter((i) => i.status === 'open').slice(0, 20).map((i) => ({
      id: i.id, title: i.title,
      ageDays: Math.max(0, Math.round((Date.now() - new Date(i.createdAt || Date.now()).getTime()) / 86400000)),
    })),
    routines: s.routines.filter((r) => !r.archived).slice(0, 20).map((r) => ({ id: r.id, name: r.name, time: r.time, durMin: r.durMin })),
    energy: energyOf(s.health),
    recentStats: Array.from({ length: 14 }, (_, idx) => {
      const d = addDays(new Date(), -(14 - idx))
      const k = dateKey(d)
      const stat = s.dayStats[k]
      return { date: k, done: stat?.done ?? 0, total: stat?.total ?? 0 }
    }),
  }
}

export type AIResult =
  | { ok: true; proposals: AIProposalDTO[]; observations?: string[] }
  | { ok: false; error: 'ai_not_configured' | 'network' | 'bad_output' | 'bad_request' }

/**
 * AI 建议链路（已接通用户自带接口）：
 * 旧实现 POST /api/ai——移动端是纯静态 SPA，该端点从未存在，功能一直是死的。
 * 现在复用 lib/ai-provider 的 OpenAI 兼容客户端 + 用户 aiConfig，
 * 输出仍走 zod aiResponseSchema 白名单校验（AI 只产 Proposal，不写库）。
 */
export async function requestAI(ability: AIAbility, opts: { fetchImpl?: typeof fetch } = {}): Promise<AIResult> {
  const cfg = useData.getState().aiConfig
  if (!isConfigured(cfg)) return { ok: false, error: 'ai_not_configured' }
  const context = buildAIContext()
  const langWord = context.lang === 'zh' ? '中文' : 'English'
  const sys = '你是日程应用的规划助手。根据用户上下文为指定 ability 产出建议。'
    + `只输出 JSON（不要解释、不要 markdown），形如 {"observations":["…"],"proposals":[{"id":"p1","type":"…","title":"…","detail":"…","date":"YYYY-MM-DD","time":"HH:MM","durMin":30,"refInboxId":"…","refTaskId":"…"}]}。`
    + 'type 只允许 create_task|move_task|create_routine|adjust_note；proposals 最多 8 条；title 用' + langWord + '。'
    + 'ability 语义：plan_day=把收集箱与空闲时间排进今天（create_task/move_task 带 time）；'
    + 'sort_inbox=逐条分拣收集箱（给时间转任务 create_task 带 refInboxId，或不重要建议 adjust_note）；'
    + 'review_observer=根据近 14 天完成率给 1-2 条可执行观察（adjust_note 或 create_routine）。'
  const res = await chatCompletion(cfg, [{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify({ ability, context }) }], { timeoutMs: 45_000, ...opts })
  if (!res.ok) {
    if (res.error === 'not_configured') return { ok: false, error: 'ai_not_configured' }
    if (res.error === 'insecure_url') return { ok: false, error: 'bad_request' }
    if (res.error === 'timeout' || res.error === 'network') return { ok: false, error: 'network' }
    return { ok: false, error: 'bad_output' }
  }
  const v = aiResponseSchema.safeParse(extractJsonObject(res.text))
  if (!v.success) return { ok: false, error: 'bad_output' }
  const rejected = rejectedKeys()
  const proposals = v.data.proposals.filter((p) => !rejected.has(key(p.type, p.title)))
  return { ok: true, proposals, observations: v.data.observations }
}
