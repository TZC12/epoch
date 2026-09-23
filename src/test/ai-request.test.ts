import { beforeEach, describe, expect, it } from 'vitest'
import { initialData, useData } from '@/services/store'
import * as A from '@/services/actions'
import { requestAI } from '@/lib/ai-client'
import { setAIConfig } from '@/services/actions'
import { extractJsonObject } from '@/lib/ai-provider'

beforeEach(() => {
  localStorage.clear()
  useData.persist.clearStorage()
  A.__replaceStateForTests(structuredClone(initialData))
})

/* Response 是同步构造的，不必 async（await 一个非 Promise 也照样成立） */
const okFetch = (content: string) => (() =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }))) as unknown as typeof fetch

describe('requestAI 走用户自带接口', () => {
  it('未配置 → ai_not_configured', async () => {
    const r = await requestAI('sort_inbox')
    expect(r).toEqual({ ok: false, error: 'ai_not_configured' })
  })

  it('http 端点 → bad_request（不发请求）', async () => {
    setAIConfig({ baseUrl: 'http://insecure.example/v1', apiKey: 'k', model: 'm' })
    const r = await requestAI('plan_day')
    expect(r).toEqual({ ok: false, error: 'bad_request' })
  })

  it('合法 JSON（带围栏）→ ok；混入越权 type → 整包 bad_output（白名单红线）', async () => {
    setAIConfig({ baseUrl: 'https://api.my.com/v1', apiKey: 'k', model: 'm' })
    const good = '```json\n' + JSON.stringify({
      observations: ['收集箱有 2 条未处理'],
      proposals: [
        { id: 'p1', type: 'create_task', title: '联系供应商', time: '14:00', date: '2026-09-21', durMin: 20 },
      ],
    }) + '\n```'
    const r = await requestAI('sort_inbox', { fetchImpl: okFetch(good) })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.proposals[0]).toMatchObject({ type: 'create_task', title: '联系供应商' })
    const evil = JSON.stringify({ proposals: [{ id: 'p1', type: 'create_task', title: 'ok' }, { id: 'p2', type: 'delete_everything', title: '越权' }] })
    expect(await requestAI('sort_inbox', { fetchImpl: okFetch(evil) })).toEqual({ ok: false, error: 'bad_output' })
    expect(await requestAI('sort_inbox', { fetchImpl: okFetch('这里没有 JSON') })).toEqual({ ok: false, error: 'bad_output' })
  })

  it('extractJsonObject 剥围栏', () => {
    expect(extractJsonObject('前 {"a":1} 后')).toEqual({ a: 1 })
    expect(extractJsonObject('```\n{"b":2}\n```')).toEqual({ b: 2 })
    expect(extractJsonObject('nope')).toBeNull()
  })
})
