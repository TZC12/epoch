#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
//  scripts/inject.mjs
//
//  Cloudflare Pages 构建时脚本：把 index.html 中的占位符
//  __SUPABASE_URL__ 和 __SUPABASE_ANON_KEY__ 替换为
//  process.env 中的真实值。
//
//  在 Cloudflare Pages 项目设置里：
//    Build command:        node scripts/inject.mjs
//    Build output:         .
//    Environment vars:
//      - SUPABASE_URL
//      - SUPABASE_ANON_KEY
//
//  仓库里永远不出现生产凭证。CI / 本地开发也只需注入这两个值。
// ═══════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const target = resolve(root, 'index.html')

const url = process.env.SUPABASE_URL || ''
const key = process.env.SUPABASE_ANON_KEY || ''

if (!url || !key) {
  console.error('[inject] ERROR: SUPABASE_URL and SUPABASE_ANON_KEY must be set.')
  console.error('[inject] Locally: set them in .env or run with env vars.')
  console.error('[inject] On Cloudflare: set them in Pages → Settings → Environment variables.')
  process.exit(1)
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
  console.warn(`[inject] WARN: SUPABASE_URL does not look like a Supabase URL: ${url}`)
}
if (!/^sb_(publishable|publiveable)_/i.test(key) && !/^ey/i.test(key)) {
  console.warn(`[inject] WARN: SUPABASE_ANON_KEY does not look like a known format.`)
}

let html
try {
  html = readFileSync(target, 'utf8')
} catch (err) {
  console.error(`[inject] ERROR: cannot read ${target}`)
  console.error(err.message)
  process.exit(1)
}

const before = html
html = html.replaceAll('__SUPABASE_URL__', url)
html = html.replaceAll('__SUPABASE_ANON_KEY__', key)

if (html === before) {
  console.warn('[inject] WARN: no placeholders replaced. Did index.html contain __SUPABASE_URL__ and __SUPABASE_ANON_KEY__?')
}

// ── 版本标识：每次构建生成 version.json + 页面内嵌 commit SHA ──
// Cloudflare Pages 构建环境官方注入 CF_PAGES / CF_PAGES_BRANCH / CF_PAGES_COMMIT_SHA；
// 本地 npm run dev / build 没有这些变量 → environment=development, commit=dev-local。
let pkg = {}
try { pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) } catch (_) {}
const commit = (process.env.CF_PAGES_COMMIT_SHA || '').trim()
const branch = (process.env.CF_PAGES_BRANCH || '').trim()
const onPages = process.env.CF_PAGES === '1' || !!commit
const versionInfo = {
  name: pkg.name || 'epoch',
  version: pkg.version || '0.0.0',
  commit: commit || 'dev-local',
  branch: branch || 'local',
  environment: onPages ? (branch === 'main' ? 'production' : 'preview') : 'development',
  built_at: new Date().toISOString(),
}
try {
  writeFileSync(resolve(root, 'version.json'), JSON.stringify(versionInfo, null, 2) + '\n')
} catch (err) {
  console.error('[inject] WARN: cannot write version.json —', err.message)
}
html = html.replaceAll('__APP_VERSION__', versionInfo.commit)
if (html.includes('__APP_VERSION__')) {
  console.warn('[inject] WARN: __APP_VERSION__ placeholder still present in index.html')
}
console.log(`[inject] version: ${versionInfo.environment} · ${versionInfo.commit.slice(0, 7)} · ${versionInfo.branch} · ${versionInfo.built_at}`)

writeFileSync(target, html)
console.log(`[inject] injected SUPABASE_URL + SUPABASE_ANON_KEY into ${target}`)