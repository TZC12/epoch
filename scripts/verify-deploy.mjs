/* ─────────────────────────────────────────────────────────────────
   verify-deploy.mjs · 生产侧部署验证（取代 .deploy/verify_deploy.py——本机无 python）
   ─────────────────────────────────────────────────────────────────
   用法：npm run verify:deploy [完整SHA] [--timeout 480]
   不传 SHA 时自动取远端 main 顶端（gh-api-push.mjs 走 API 造的 squash commit，
   SHA 与本地 HEAD 永不相同，所以不能拿本地 HEAD 当期望值）。

   PASS 条件（两条都要）：
     1) https://<pages>/version.json 的 commit == 期望 SHA
     2) 生产 HTML 里 <meta name="app-version"> == 期望 SHA
   退出码 0 = PASS，1 = 超时或不一致，2 = 取不到期望值。
   ───────────────────────────────────────────────────────────────── */
const BASE = 'https://personal-workbench-3t8.pages.dev'
const INTERVAL = 15_000
const argv = process.argv.slice(2)
const TIMEOUT = (() => {
  const i = argv.indexOf('--timeout')
  return i >= 0 && Number(argv[i + 1]) ? Number(argv[i + 1]) * 1000 : 480_000
})()
const token = (n) => (n || '').trim()

async function expected() {
  const positional = argv.find((a) => /^[0-9a-f]{40}$/.test(a))
  if (positional) return { sha: positional, from: 'argv' }
  // 公开 API，无凭据也读得到；失败再回落本机 git（只能拿到本地 HEAD，标注清楚）
  try {
    const r = await fetch('https://api.github.com/repos/TZC12/epoch/commits/heads/main', {
      headers: { 'User-Agent': 'epoch-deploy-verify', Accept: 'application/vnd.github+json' },
    })
    const j = await r.json()
    if (j?.sha) return { sha: j.sha, from: 'remote main' }
  } catch { /* 网络被污染时走 git */ }
  try {
    const { execFileSync } = await import('node:child_process')
    return { sha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), from: 'local HEAD(!!)' }
  } catch { return null }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const want = await expected()
if (!want) { console.error('[verify] 取不到期望 commit'); process.exit(2) }
console.log(`[verify] 期望 commit ${want.sha.slice(0, 10)}… (来源 ${want.from})`)

const deadline = Date.now() + TIMEOUT
let last = ''
for (let n = 1; ; n++) {
  let json = null, meta = ''
  try {
    json = await (await fetch(`${BASE}/version.json?_=${Date.now()}`)).json()
  } catch { /* 构建中或还没产出 version.json */ }
  try {
    const html = await (await fetch(`${BASE}/?_=${Date.now()}`)).text()
    meta = token((html.match(/name="app-version"\s+content="([^"]*)"/) || [])[1])
  } catch { /* 忽略，下一轮 */ }
  const line = `version.json=${json?.commit?.slice(0, 10) ?? '—'} meta=${meta.slice(0, 10) || '—'} env=${json?.environment ?? '—'} built_at=${json?.built_at ?? '—'}`
  if (line !== last) { console.log(`[verify] #${n} ${line}`); last = line }
  if (json?.commit === want.sha && meta === want.sha) {
    console.log(`[verify] PASS — 生产已是 ${want.sha.slice(0, 10)}…（${json.environment}，构建于 ${json.built_at}）`)
    process.exit(0)
  }
  if (Date.now() > deadline) {
    console.error(`[verify] TIMEOUT — 期望 ${want.sha.slice(0, 10)}…，线上停在 ${json?.commit ?? 'unknown'}。去 Pages 看构建是否失败。`)
    process.exit(1)
  }
  await sleep(INTERVAL)
}
