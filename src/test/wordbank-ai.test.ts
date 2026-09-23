import { beforeEach, describe, expect, it } from 'vitest'
import { initialData, useData } from '@/services/store'
import * as A from '@/services/actions'
import { parseWordImport } from '@/lib/word-import'
import { extractJsonArray, isConfigured, normalizeBaseUrl, chatCompletion } from '@/lib/ai-provider'
import { todayKey, addDaysKey } from '@/lib/dates'

beforeEach(() => {
  localStorage.clear()
  useData.persist.clearStorage()
  A.__replaceStateForTests(structuredClone(initialData))
})

describe('词库导入解析', () => {
  it('逗号/Tab/冒号/多空格分隔逐行解析；无释义行计 invalid', () => {
    const r = parseWordImport('apple, 苹果\nbanana\t香蕉\nchinese：中文\ndurian  榴莲\nbadline')
    expect(r.entries.map((e) => e.word)).toEqual(['apple', 'banana', 'chinese', 'durian'])
    expect(r.entries[2]!.meaning).toBe('中文')
    expect(r.invalid).toBe(1)
  })

  it('JSON 数组（对象/元组）与字典式对象', () => {
    const a = parseWordImport(JSON.stringify([{ word: 'cat', meaning: '猫', example: 'a cat runs', tag: '动物' }, ['dog', '狗']]))
    expect(a.entries).toHaveLength(2)
    expect(a.entries[0]).toMatchObject({ word: 'cat', example: 'a cat runs', tag: '动物' })
    const d = parseWordImport(JSON.stringify({ fox: '狐狸', wolf: '狼' }))
    expect(d.entries.map((e) => e.word).sort()).toEqual(['fox', 'wolf'])
  })

  it('坏 JSON 全部计 invalid，不抛异常', () => {
    const r = parseWordImport('[{broken')
    expect(r.entries).toHaveLength(0)
    expect(r.invalid).toBeGreaterThan(0)
  })
})

describe('importWords + Leitner 复习排程', () => {
  const lang = () => {
    const l = A.addLearnLang('英语')!
    return l.id
  }

  it('导入去重（大小写不敏感），新词 box=1 due=今天', () => {
    const id = lang()
    A.addLearnWord(id, 'Apple', '苹果')
    const r = A.importWords(id, 'apple, 苹果(重复)\nbanana, 香蕉')
    expect(r).toMatchObject({ added: 1, skipped: 1 })
    const w = useData.getState().learnWords.find((x) => x.word === 'banana')!
    expect(w.box).toBe(1)
    expect(w.due).toBe(todayKey())
    expect(w.source).toBe('import')
  })

  it('认识→box+1 间隔 1/2/4/9 天封顶 5；不认识→回 box1 今天到期', () => {
    const id = lang()
    const w = A.addLearnWord(id, 'cat', '猫')!
    A.gradeWord(w.id, true)
    expect(useData.getState().learnWords[0]).toMatchObject({ box: 2, due: addDaysKey(todayKey(), 1) })
    A.gradeWord(w.id, true)
    expect(useData.getState().learnWords[0]).toMatchObject({ box: 3, due: addDaysKey(todayKey(), 2) })
    A.gradeWord(w.id, false)
    expect(useData.getState().learnWords[0]).toMatchObject({ box: 1, due: todayKey() })
    for (let i = 0; i < 9; i++) A.gradeWord(w.id, true)
    expect(useData.getState().learnWords[0]).toMatchObject({ box: 5, due: addDaysKey(todayKey(), 9) })
  })

  it('applyWordPatches 按词匹配只回填非空字段', () => {
    const id = lang()
    A.addLearnWord(id, 'lead', '铅')
    const hit = A.applyWordPatches([
      { word: 'LEAD', meaning: '领导；铅', example: 'lead the way', tag: null },
      { word: 'ghost', example: 'x' },
    ], id)
    expect(hit).toBe(1)
    expect(useData.getState().learnWords[0]).toMatchObject({ meaning: '领导；铅', example: 'lead the way' })
  })
})

describe('AI 接口层', () => {
  it('extractJsonArray 剥围栏取数组', () => {
    expect(extractJsonArray('```json\n[{"a":1}]\n```')).toEqual([{ a: 1 }])
    expect(extractJsonArray('前缀文字 [1,2] 后缀')).toEqual([1, 2])
    expect(extractJsonArray('没有数组')).toBeNull()
  })

  it('isConfigured / normalizeBaseUrl', () => {
    expect(isConfigured(null)).toBe(false)
    expect(isConfigured({ baseUrl: 'https://x/v1/', apiKey: ' k ', model: 'm' })).toBe(true)
    expect(normalizeBaseUrl(' https://x/v1// ')).toBe('https://x/v1')
  })

  it('http 端点拒绝（insecure_url）；未配置拒绝', async () => {
    const bad = await chatCompletion({ baseUrl: 'http://evil.com/v1', apiKey: 'k', model: 'm' }, [])
    expect(bad).toEqual({ ok: false, error: 'insecure_url' })
    const none = await chatCompletion({ baseUrl: '', apiKey: '', model: '' }, [])
    expect(none).toEqual({ ok: false, error: 'not_configured' })
  })

  it('chatCompletion 走 OpenAI 兼容协议并取 choices[0].message.content', async () => {
    let seen: { url: string; auth: string; body: Record<string, unknown> } | null = null
    const fakeFetch = ((url: string, init: RequestInit) => {
      const raw = typeof init.body === 'string' ? init.body : '{}'
      seen = { url, auth: String((init.headers as Record<string, string>).Authorization), body: JSON.parse(raw) as Record<string, unknown> }
      return new Response(JSON.stringify({ choices: [{ message: { content: 'hello' } }] }))
    }) as unknown as typeof fetch
    const res = await chatCompletion({ baseUrl: 'https://api.my.com/v1', apiKey: 'sk-test', model: 'glm-4' }, [{ role: 'user', content: 'hi' }], { fetchImpl: fakeFetch })
    expect(res).toEqual({ ok: true, text: 'hello' })
    expect(seen!.url).toBe('https://api.my.com/v1/chat/completions')
    expect(seen!.auth).toBe('Bearer sk-test')
    expect(seen!.body.model).toBe('glm-4')
  })

  it('setAIConfig 归一化 baseUrl 且可清除', () => {
    A.setAIConfig({ baseUrl: 'https://a/b/', apiKey: 'k', model: 'm' })
    expect(useData.getState().aiConfig).toEqual({ baseUrl: 'https://a/b', apiKey: 'k', model: 'm' })
    A.setAIConfig(null)
    expect(useData.getState().aiConfig).toBeNull()
  })
})
