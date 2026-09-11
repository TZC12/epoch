#!/usr/bin/env node
/**
 * Phase 6 PR-7 · legacy 引用守门
 * ─────────────────────────────────
 * 扫 src/ 下 .ts/.tsx 全部文件，禁止出现 `legacy.html` 或 `src.legacy` 字面引用。
 * 注释会被剥离（避免 `NetBackground.tsx` "自 legacy.html 引擎 1:1 移植" 这条
 * 历史注释的误报；该注释将在 PR-8 与 legacy.html 一起清掉）。
 * 字符串字面量保留——如果哪天有人写 `import x from './legacy.html'`，会被抓到。
 *
 * 用法：node scripts/check-no-legacy-refs.mjs [dir]
 *   默认扫 ./src
 *
 * 退出码：0 干净 / 1 有命中
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, resolve, extname as pathExtname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(__dirname, '..')
const target = resolve(root, process.argv[2] ?? 'src')

const PATTERNS = [
  { re: /legacy\.html/g, label: 'legacy.html path' },
  { re: /src\.legacy/g,  label: 'src.legacy path' },
]

const EXTS = new Set(['.ts', '.tsx'])
const IGNORE_DIRS = new Set(['node_modules', 'dist', 'dev-dist', '.git', '.workbuddy'])

/** 递归收集目标目录下所有 .ts/.tsx 文件路径。 */
async function* walk(dir) {
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) }
  catch { return }
  for (const e of entries) {
    if (IGNORE_DIRS.has(e.name)) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (EXTS.has(pathExtname(e.name))) yield p
  }
}

/**
 * 剥离 JS/TS 注释，保留字符串字面量。
 * - 块注释 /* ... *\/  → 整段去掉
 * - 行注释 // ... \n   → 去掉到行尾
 * - 字符串里如果含 // 或 /* 不算注释（保留原样）
 *
 * 实现：单遍扫描 + 状态机（inCode / inLineComment / inBlockComment / inString）
 */
function stripComments(src) {
  let out = ''
  let i = 0
  let mode = 'code'  // 'code' | 'line' | 'block' | 'string' | 'sq' | 'tpl'
  const N = src.length

  while (i < N) {
    const c = src[i]
    const c2 = src.slice(i, i + 2)

    if (mode === 'code') {
      if (c2 === '//') { mode = 'line'; i += 2; continue }
      if (c2 === '/*') { mode = 'block'; i += 2; continue }
      if (c === '"')  { mode = 'string'; out += c; i++; continue }
      if (c === "'")  { mode = 'sq';     out += c; i++; continue }
      if (c === '`')  { mode = 'tpl';    out += c; i++; continue }
      out += c; i++; continue
    }

    if (mode === 'line') {
      if (c === '\n') { mode = 'code'; out += '\n' }
      i++; continue
    }

    if (mode === 'block') {
      if (c2 === '*/') { mode = 'code'; i += 2; continue }
      if (c === '\n') out += '\n'  // 保留换行，行号不漂
      i++; continue
    }

    // 字符串三种：双 / 单 / 模板。同款处理：找到匹配引号或行尾。
    if (mode === 'string' || mode === 'sq' || mode === 'tpl') {
      const q = mode === 'string' ? '"' : mode === 'sq' ? "'" : '`'
      if (c === '\\' && i + 1 < N) { out += src.slice(i, i + 2); i += 2; continue }
      if (c === q) { mode = 'code'; out += c; i++; continue }
      if (mode === 'tpl' && c2 === '${') {
        // 模板字符串里的插值：递归处理到匹配的 }
        out += '${'; i += 2
        // 简化：把 ${ ... } 当成 code 区段
        let depth = 1
        while (i < N && depth > 0) {
          const cc = src[i]
          if (cc === '{') depth++
          else if (cc === '}') depth--
          if (depth === 0) { out += '}'; i++; break }
          out += cc; i++
        }
        continue
      }
      out += c; i++
    }
  }
  return out
}

let hits = 0
/** 扫一个文件并报告命中。 */
async function scanFile(file) {
  const src = await readFile(file, 'utf8')
  const stripped = stripComments(src)
  for (const { re, label } of PATTERNS) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(stripped)) !== null) {
      const before = stripped.slice(0, m.index)
      const lineNo = before.split('\n').length
      hits++
      console.error(`✗ ${relative(root, file)}:${lineNo}  contains ${label} ("${m[0]}")`)
    }
  }
}

// 兼容单文件或目录两种入参
const targetStat = await stat(target).catch(() => null)
if (targetStat?.isFile()) {
  await scanFile(target)
} else {
  for await (const file of walk(target)) {
    await scanFile(file)
  }
}

if (hits === 0) {
  console.log(`✓ no legacy refs in ${relative(root, target)} (comments stripped)`)
  process.exit(0)
}
console.error(`\n${hits} legacy reference(s) found. Remove them before merging.`)
process.exit(1)
