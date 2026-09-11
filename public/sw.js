/* Epoch Service Worker —— 最小离线兜底（零依赖手写，不用 workbox）。
   策略：
   - 精确预缓存 app shell（./ 与 install 时列出的构建产物由 runtime 缓存接管，见 fetch）；
   - 导航请求：network-first，失败回退缓存首页（SPA 单入口）；
   - 同源静态资源（/assets/* 带内容哈希）：cache-first（哈希变 ⇒ URL 变，天然免失效问题）；
   - API/Supabase/天气：一律网络直达，不缓存（个人数据与实时数据不做离线假象）。
   版本：CACHE 名带版本号，activate 清旧。改任何缓存策略必须升 VERSION。 */
const VERSION = 'v1'
const SHELL_CACHE = `epoch-shell-${VERSION}`
const ASSET_CACHE = `epoch-asset-${VERSION}`
const SHELL_URLS = ['/', '/manifest.webmanifest', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()),
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
        .catch(() => caches.match('/')),
    )
    return
  }

  /* 带哈希的构建产物：cache-first */
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(
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
