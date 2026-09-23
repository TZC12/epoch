import type { AIConfig } from '@/services/types'

/**
 * 用户自带 AI 接口（OpenAI 兼容 /chat/completions），浏览器直连。
 * 安全边界：apiKey 只存本机 localStorage，不进 store 云同步、不进任何日志；
 * baseUrl 由用户自填 → 仅接受 https 或 localhost（防明文泄漏 key）。
 */

export type AIError = 'not_configured' | 'insecure_url' | 'network' | 'http' | 'bad_output' | 'timeout'

export type ChatResult = { ok: true; text: string } | { ok: false; error: AIError }

export function normalizeBaseUrl(u: string): string {
  return u.trim().replace(/\/+$/, '')
}

export function isConfigured(c: AIConfig | null): c is AIConfig {
  return !!c && !!normalizeBaseUrl(c.baseUrl) && !!c.apiKey.trim() && !!c.model.trim()
}

function urlAllowed(u: string): boolean {
  try {
    const x = new URL(u)
    return x.protocol === 'https:' || x.hostname === 'localhost' || x.hostname === '127.0.0.1'
  } catch { return false }
}

export async function chatCompletion(
  cfg: AIConfig,
  messages: { role: string; content: string }[],
  opts: { timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<ChatResult> {
  if (!isConfigured(cfg)) return { ok: false, error: 'not_configured' }
  const base = normalizeBaseUrl(cfg.baseUrl)
  if (!urlAllowed(base)) return { ok: false, error: 'insecure_url' }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000)
  const doFetch = opts.fetchImpl ?? globalThis.fetch.bind(globalThis)
  let resp: Response
  try {
    resp = await doFetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey.trim()}` },
      body: JSON.stringify({ model: cfg.model.trim(), messages, temperature: 0.3 }),
      signal: controller.signal,
    })
  } catch {
    clearTimeout(timer)
    return { ok: false, error: controller.signal.aborted ? 'timeout' : 'network' }
  }
  clearTimeout(timer)
  if (!resp.ok) return { ok: false, error: 'http' }
  let data: unknown
  try { data = await resp.json() } catch { return { ok: false, error: 'bad_output' } }
  const choices = (data as { choices?: { message?: { content?: unknown } }[] })?.choices
  const text = typeof choices?.[0]?.message?.content === 'string' ? choices[0].message.content : null
  if (!text) return { ok: false, error: 'bad_output' }
  return { ok: true, text }
}

/** 宽容提取 JSON 数组（剥 ``` 围栏、截取首尾方括号）。 */
export function extractJsonArray(text: string): unknown[] | null {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start < 0 || end <= start) return null
  try {
    const v: unknown = JSON.parse(cleaned.slice(start, end + 1))
    return Array.isArray(v) ? v : null
  } catch { return null }
}

/** 同上，提取 JSON 对象（AI 建议响应为 {proposals, observations} 对象）。数组/标量一律算没解析出来。 */
export function extractJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const v: unknown = JSON.parse(cleaned.slice(start, end + 1))
    return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
  } catch { return null }
}

export interface WordOrganizePatch {
  word: string
  meaning?: string
  example?: string | null
  tag?: string | null
}

/** AI 整理：给词表，要求逐词回填释义/例句/分组，返回可应用补丁（解析失败→bad_output）。 */
export async function organizeWords(
  cfg: AIConfig,
  langName: string,
  words: { word: string; meaning: string }[],
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<{ ok: true; patches: WordOrganizePatch[] } | { ok: false; error: AIError }> {
  const list = words.slice(0, 200)
  const sys = '你是词汇学习助手。对用户给出的每个词条，输出 JSON 数组（不要任何解释文字），'
    + '每项形如 {"word":"原词","meaning":"简洁释义","example":"一条地道例句","tag":"主题分组(2-6字)"}。'
    + 'word 必须与输入完全一致；释义和例句用简体中文（learn 语言为其他语种时例句保留原语种）。'
  const user = `语言：${langName}\n词条：\n${JSON.stringify(list.map((w) => ({ word: w.word, meaning: w.meaning })))}`
  const res = await chatCompletion(cfg, [{ role: 'system', content: sys }, { role: 'user', content: user }], { timeoutMs: 60_000, ...opts })
  if (!res.ok) return res
  const arr = extractJsonArray(res.text)
  if (!arr) return { ok: false, error: 'bad_output' }
  const patches: WordOrganizePatch[] = []
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const word = typeof o.word === 'string' ? o.word.trim() : ''
    if (!word) continue
    patches.push({
      word,
      meaning: typeof o.meaning === 'string' && o.meaning.trim() ? o.meaning.trim() : undefined,
      example: typeof o.example === 'string' && o.example.trim() ? o.example.trim() : null,
      tag: typeof o.tag === 'string' && o.tag.trim() ? o.tag.trim().slice(0, 12) : null,
    })
  }
  return { ok: true, patches }
}
