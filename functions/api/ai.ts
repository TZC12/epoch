import { aiRequestSchema, aiResponseSchema } from '../../src/shared/ai-schema'

/**
 * POST /api/ai — Cloudflare Pages Function（服务端 LLM 代理）。
 *
 * Provider 抽象（免费优先，用户决策 2026-09-08）：
 *  ① Cloudflare Workers AI（默认）：env.AI_ACCOUNT_ID + env.AI_API_TOKEN（免费额度模型 @cf/meta/llama-3.1-8b-instruct）
 *  ② OpenAI 兼容适配器：env.AI_BASE_URL + env.AI_API_KEY + env.AI_MODEL（DeepSeek/GLM 免费档等，一键切换）
 * 两者都未配置 → 503 ai_not_configured（前端提示，不影响产品其余功能）。
 *
 * 红线：key 只在本文件出现；输出过 zod 白名单校验；AI 只产 Proposal 不写库。
 */

export const onRequestPost = async (ctx: { request: Request; env: Record<string, string | undefined> }): Promise<Response> => {
  let body: unknown
  try { body = await ctx.request.json() } catch { return json({ error: 'bad_json' }, 400) }

  const parsed = aiRequestSchema.safeParse(body)
  if (!parsed.success) return json({ error: 'bad_request' }, 400)
  const { ability, context } = parsed.data

  const provider = pickProvider(ctx.env)
  if (!provider) return json({ error: 'ai_not_configured' }, 503)

  let raw: string
  try {
    raw = await provider.complete(buildPrompt(ability, context))
  } catch (err) {
    console.error('[ai] provider error', err)
    return json({ error: 'provider_error' }, 502)
  }

  // 解析 + 白名单校验（非法 JSON / 越权动作类型一律 502，前端据此提示）
  const result = parseModelOutput(raw)
  if (!result.ok) return json({ error: 'bad_model_output' }, 502)
  return json(result.value, 200)
}

/* ─────────────── provider 抽象 ─────────────── */

interface Provider { complete: (prompt: string) => Promise<string> }

function pickProvider(env: Record<string, string | undefined>): Provider | null {
  if (env.AI_BASE_URL && env.AI_API_KEY && env.AI_MODEL) {
    return openAICompatProvider(env.AI_BASE_URL, env.AI_API_KEY, env.AI_MODEL)
  }
  if (env.AI_ACCOUNT_ID && env.AI_API_TOKEN) {
    return workersAIProvider(env.AI_ACCOUNT_ID, env.AI_API_TOKEN)
  }
  return null
}

function workersAIProvider(accountId: string, token: string): Provider {
  return {
    async complete(prompt: string): Promise<string> {
      const resp = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: SYSTEM },
              { role: 'user', content: prompt },
            ],
            max_tokens: 1200,
            temperature: 0.3,
          }),
        },
      )
      if (!resp.ok) throw new Error(`workers_ai_${resp.status}`)
      const data = (await resp.json()) as { result?: { response?: string } }
      return data.result?.response ?? ''
    },
  }
}

function openAICompatProvider(baseUrl: string, key: string, model: string): Provider {
  return {
    async complete(prompt: string): Promise<string> {
      const resp = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: prompt },
          ],
          max_tokens: 1200,
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      })
      if (!resp.ok) throw new Error(`openai_compat_${resp.status}`)
      const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> }
      return data.choices?.[0]?.message?.content ?? ''
    },
  }
}

const SYSTEM = `You are the planning assistant inside Epoch, a calm personal-OS app. You read the user's real data (direction, goals, today's tasks, inbox, routines, energy, recent completion) and output ONLY strict JSON — no markdown, no prose.
Schema:
{"proposals":[{"id":"p1","type":"create_task|move_task|create_routine|adjust_note","title":"...","detail":"...","date":"YYYY-MM-DD","time":"HH:MM","durMin":30,"refInboxId":"...","refTaskId":"..."}],"observations":["..."]}
Rules:
- At most 6 proposals; at most 3 observations.
- Every proposal must reference real context items when moving/creating (use refInboxId / refTaskId when applicable).
- Respect wake/sleep/work windows; never schedule outside them; prefer gaps; low energy => suggest fewer/lighter items.
- Calm, non-judgmental tone. Never punish. Titles in the user's language (context.lang).`

function buildPrompt(ability: string, ctxJson: unknown): string {
  const perAbility: Record<string, string> = {
    plan_day: 'Task: suggest a realistic plan for TODAY. Fill free gaps: order by importance; convert open inbox items (refInboxId) into scheduled tasks; reschedule overdue main tasks (refTaskId) if the day is heavy.',
    sort_inbox: 'Task: triage the open inbox items. For each, propose either create_task (with a concrete time/duration that fits the day or tomorrow) — always set refInboxId.',
    review_observer: 'Task: weekly review observer. Output up to 3 observations (patterns from recentStats/pct, e.g. overload days) and exactly 1 proposal of type adjust_note describing the one change for next week.',
  }
  return `${perAbility[ability] ?? perAbility.plan_day!}\n\nContext JSON:\n${JSON.stringify(ctxJson)}`
}

/* ─────────────── 输出解析 + 白名单校验 ─────────────── */

function parseModelOutput(raw: string): { ok: true; value: import('../../src/shared/ai-schema').AIResponseDTO } | { ok: false } {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return { ok: false }
  let parsed: unknown
  try { parsed = JSON.parse(raw.slice(start, end + 1)) } catch { return { ok: false } }
  const v = aiResponseSchema.safeParse(parsed)
  if (!v.success) return { ok: false }
  return { ok: true, value: v.data }
}

function json(data: unknown, status: 200 | 400 | 403 | 502 | 503): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}
