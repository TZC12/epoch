/** 词库导入解析：粘贴文本 / CSV / TSV / JSON → 词条数组（纯函数，供 actions 与测试复用）。 */

export interface ParsedWord {
  word: string
  meaning: string
  example: string | null
  tag: string | null
}

export interface ParseResult {
  entries: ParsedWord[]
  invalid: number
}

/** 行内分隔符优先级：Tab → 逗号 → 中文冒号/冒号 → 连续空格。 */
function splitLine(line: string): [string, string] | null {
  for (const sep of ['\t', ',', '，', '：', ':']) {
    const i = line.indexOf(sep)
    if (i > 0) return [line.slice(0, i).trim(), line.slice(i + sep.length).trim()]
  }
  const m = /^(.+?)\s{2,}(.+)$/.exec(line)
  if (m) return [m[1].trim(), m[2].trim()]
  return null
}

/** 只收标量：嵌套对象不该被 stringify 成 "[object Object]" 混进词库。 */
function scalar(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function fromJson(text: string): unknown[] | null {
  const data: unknown = JSON.parse(text)
  if (Array.isArray(data)) return data as unknown[]
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    const list = obj.words ?? obj.entries ?? obj.data
    if (Array.isArray(list)) return list as unknown[]
    /* {"apple":"一个苹果"} 字典式 */
    return Object.entries(obj).map(([word, meaning]) => ({ word, meaning: scalar(meaning) }))
  }
  return null
}

export function parseWordImport(raw: string): ParseResult {
  const text = raw.trim()
  if (!text) return { entries: [], invalid: 0 }
  const entries: ParsedWord[] = []
  let invalid = 0

  if (text.startsWith('[') || text.startsWith('{')) {
    let list: unknown[] | null = null
    try { list = fromJson(text) } catch { list = null }
    if (!list) return { entries: [], invalid: text.split(/\r?\n/).filter(Boolean).length }
    for (const item of list) {
      if (Array.isArray(item) && item.length >= 2) {
        entries.push({ word: scalar(item[0]).trim(), meaning: scalar(item[1]).trim(), example: scalar(item[2]).trim() || null, tag: null })
        continue
      }
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>
        const word = scalar(o.word ?? o.term ?? o.en ?? o.title).trim()
        const meaning = scalar(o.meaning ?? o.definition ?? o.def ?? o.tr ?? o.translation ?? o.zh).trim()
        if (word && meaning) {
          entries.push({
            word, meaning,
            example: scalar(o.example) || null,
            tag: scalar(o.tag ?? o.group) || null,
          })
          continue
        }
      }
      invalid += 1
    }
    return { entries: entries.filter((e) => e.word && e.meaning), invalid }
  }

  for (const line of text.split(/\r?\n/)) {
    const l = line.trim()
    if (!l) continue
    const parts = splitLine(l)
    if (!parts) { invalid += 1; continue }
    const [word, meaning] = parts
    if (!word || !meaning) { invalid += 1; continue }
    entries.push({ word, meaning, example: null, tag: null })
  }
  return { entries, invalid }
}
