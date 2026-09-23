/* ─────────────────────────────────────────────────────────────────
   patch-sw.mjs · 构建后注入 sw.js 的预缓存清单
   ─────────────────────────────────────────────────────────────────
   vite 构建产物是带内容哈希的 /assets/*.js|css，文件名随内容变。
   precache 让 install 时一次性写入 ASSET_CACHE，二次访问无需等 fetch。

   不引入 workbox / vite-plugin-pwa，保留"零运行时依赖"设计：
   本脚本只跑在 CI/build 阶段，产物是 dist/sw.js 里的常量数组。

   触发：package.json 的 postbuild（npm run build 自动衔接）。
   ───────────────────────────────────────────────────────────────── */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(process.cwd())
const DIST = join(ROOT, 'dist')
const SW_SRC = join(ROOT, 'public', 'sw.js')
const SW_OUT = join(DIST, 'sw.js')
const PLACEHOLDER = '/* __PRECACHE_ASSETS__ */'

function fail(msg) {
  console.error('[patch-sw] ' + msg)
  process.exit(1)
}

if (!existsSync(DIST)) fail('dist/ 不存在；先跑 `vite build`。')
if (!existsSync(SW_OUT)) fail('dist/sw.js 不存在；public/sw.js 是不是没被 vite 复制？')

const assetsDir = join(DIST, 'assets')
const iconsDir = join(DIST, 'icons')

const chunks = existsSync(assetsDir)
  ? readdirSync(assetsDir).filter((f) => /\.(js|css)$/.test(f)).map((f) => '/assets/' + f)
  : []

const ICON_WHITELIST = new Set([
  'pwa-192.png',
  'pwa-512.png',
  'pwa-512-maskable.png',
  'apple-touch-icon.png',
])
const icons = existsSync(iconsDir)
  ? readdirSync(iconsDir).filter((f) => ICON_WHITELIST.has(f)).map((f) => '/icons/' + f)
  : []

const precache = [...chunks, ...icons].sort()

const src = readFileSync(SW_OUT, 'utf8')
const replacement = 'const PRECACHE_ASSETS = ' + JSON.stringify(precache, null, 2)

// 幂等：两种输入都能产出正确结果
//  - 含占位符（vite 刚复制过来的干净副本）→ 直接替换
//  - 已注入过（dist 未清理就重复跑 postbuild）→ 用正则覆盖旧数组，避免"缺占位符"误报
let out
let mode
if (src.includes(PLACEHOLDER)) {
  out = src.replace(PLACEHOLDER, replacement)
  mode = 'inject'
} else if (/const PRECACHE_ASSETS = \[[\s\S]*?\]/.test(src)) {
  // 注意：不要写成 \]\n —— dist 可能是 CRLF，那样永远匹配不上。
  out = src.replace(/const PRECACHE_ASSETS = \[[\s\S]*?\]/, replacement)
  mode = 'replace'
} else {
  fail('dist/sw.js 既无占位符也无既有 PRECACHE_ASSETS 数组；public/sw.js 的注入点被改了？')
}
writeFileSync(SW_OUT, out)
console.log('[patch-sw] ' + mode + ' ' + precache.length + ' 项（chunks=' + chunks.length + ', icons=' + icons.length + '）-> dist/sw.js')

const sourceHasPlaceholder = readFileSync(SW_SRC, 'utf8').includes(PLACEHOLDER)
if (!sourceHasPlaceholder) {
  console.warn('[patch-sw] 警告：public/sw.js 已不含占位符；下次构建会失效。')
}
