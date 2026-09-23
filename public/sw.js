/* Epoch Service Worker —— 最小离线兜底（零依赖手写，不用 workbox）。
   策略：
   - install 预缓存 app shell + 所有 vite 构建产物（hashed chunk + PWA 图标），
     二次启动直接走缓存、零网络往返；产物清单由 postbuild 脚本注入（见 PLACEHOLDER）。
   - 导航请求：network-first，失败回退缓存首页（SPA 单入口）；
   - 同源静态资源（/assets/* 带内容哈希）：cache-first（哈希变 ⇒ URL 变，天然免失效问题）；
   - API/Supabase/天气：一律网络直达，不缓存（个人数据与实时数据不做离线假象）。
   版本：CACHE 名带版本号，activate 清旧。改任何缓存策略必须升 VERSION。 */
const VERSION = 'v1'
const SHELL_CACHE = `epoch-shell-${VERSION}`
const ASSET_CACHE = `epoch-asset-${VERSION}`
const SHELL_URLS = ['/', '/manifest.webmanifest', '/favicon.svg']
/* __PRECACHE_ASSETS__ */

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)),
      caches.open(ASSET_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS)),
    ]).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  /* 跨域（Supabase / Open-Meteo）：网络直达，不缓存 */
  if (url.origin !== self.location.origin) return
  /* 同源 API（/api/ai）：不缓存 */
  if (url.pathname.startsWith('/api/')) return

  /* SPA 导航：network-first，失败回退缓存首页 */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone()
          caches.open(SHELL_CACHE).then((c) => c.put('/', copy))
          return resp
        })
        // ignoreVary：preview/托管对 HTML 会回 Vary: Origin，导航请求带 Origin 头时
        // 默认匹配会因 Vary 不一致而 miss，离线就直接白屏。
        .catch(() => caches.match('/', { ignoreVary: true })),
    )
    return
  }

  /* 带哈希的构建产物：cache-first
     ⚠️ 必须 ignoreVary：index.html 的 <script type="module" crossorigin> 会让请求走
     CORS 模式并带 Origin 头，而预缓存是用普通 fetch（无 Origin）存的；响应带
     Vary: Origin 时默认匹配会 MISS → 回落到 fetch → 离线整站起不来。
     这些是内容哈希资产，"URL 唯一决定内容"，忽略 Vary 是安全的。 */
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req, { ignoreVary: true }).then(
        (hit) => hit ||
          fetch(req).then((resp) => {
            const copy = resp.clone()
            caches.open(ASSET_CACHE).then((c) => c.put(req, copy))
            return resp
          }),
      ),
    )
  }
})
