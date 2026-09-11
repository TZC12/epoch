import { useData, goalPct, isDoneToday, tasksForDay } from '@/services/store'
import { dateKey, todayKey, addDays } from '@/lib/dates'
import { energyOf } from '@/services/actions'
import { aiResponseSchema, type AIAbility, type AIProposalDTO, type AIContextDTO } from '@/shared/ai-schema'
import i18n from '@/lib/i18n'

/**
 * AI 前端客户端：真实上下文序列化 → POST /api/ai → zod 校验。
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

export async function requestAI(ability: AIAbility): Promise<AIResult> {
  let resp: Response
  try {
    resp = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ability, context: buildAIContext() }),
    })
  } catch {
    return { ok: false, error: 'network' }
  }
  if (resp.status === 503) return { ok: false, error: 'ai_not_configured' }
  if (!resp.ok) return { ok: false, error: 'bad_output' }
  let data: unknown
  try { data = await resp.json() } catch { return { ok: false, error: 'bad_output' } }
  const v = aiResponseSchema.safeParse(data)
  if (!v.success) return { ok: false, error: 'bad_output' }

  // 拒绝记忆过滤
  const rejected = rejectedKeys()
  const proposals = v.data.proposals.filter((p) => !rejected.has(key(p.type, p.title)))
  return { ok: true, proposals, observations: v.data.observations }
}
