/**
 * PWA 离线能力 · 真浏览器验证
 * ────────────────────────────────────────────────
 * 与 src/test/pwa.test.ts 的分工：
 *  - pwa.test.ts：文件级断言（dist/sw.js 的清单有没有注入、占位符还在不在）
 *  - 本文件：运行时验证（SW 真注册？产物真进 Cache Storage？断网真能开？）
 *
 * 只验证"清单注入"是不够的——注入成功但缓存名写错、install 抛错、
 * 或路径对不上，都会让离线能力静默失效。这条测试就是补上这个闭环。
 *
 * 前提：`npm run build`（含 postbuild 注入）+ preview 起在 4173，必须是生产产物
 * （main.tsx 里 SW 仅 import.meta.env.PROD 时注册）。
 */
import { test, expect, type Page } from '@playwright/test'

const SHELL_CACHE = 'epoch-shell-v1'
const ASSET_CACHE = 'epoch-asset-v1'

/** 读 Cache Storage 里每个缓存桶的条目数 */
async function cacheSizes(page: Page): Promise<Record<string, number>> {
  return page.evaluate(async () => {
    const names = await window.caches.keys()
    const out: Record<string, number> = {}
    for (const n of names) {
      const c = await window.caches.open(n)
      out[n] = (await c.keys()).length
    }
    return out
  })
}

/** 等 SW 激活 + 预缓存写完（51 项逐个 addAll 需要时间，必须轮询而不是固定 sleep） */
async function waitForPrecache(page: Page, minAssets: number): Promise<Record<string, number>> {
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  let last: Record<string, number> = {}
  await expect
    .poll(async () => {
      last = await cacheSizes(page)
      return last[ASSET_CACHE] ?? 0
    }, { timeout: 30_000, intervals: [250, 500, 1000] })
    .toBeGreaterThanOrEqual(minAssets)
  return last
}

test.beforeEach(async ({ context }) => {
  // 每个用例从干净状态开始：SW 与缓存都是持久的，不清理会互相污染
  await context.clearCookies()
})

test('SW 注册并把构建产物预缓存进 Cache Storage', async ({ page }) => {
  await page.goto('/')

  const sizes = await waitForPrecache(page, 40)

  // shell（/ 与 manifest 等）与产物（hashed chunks + PWA 图标）分桶存放
  expect(sizes[SHELL_CACHE], 'shell 缓存桶应存在且有条目').toBeGreaterThan(0)
  expect(sizes[ASSET_CACHE], '产物缓存桶应含全部预缓存项').toBeGreaterThanOrEqual(40)

  // 具体校验：确实缓存了 hashed chunk 与 PWA 图标，而不只是缓存了 index
  const cached = await page.evaluate(async (name) => {
    const c = await window.caches.open(name)
    return (await c.keys()).map((r) => new URL(r.url).pathname).sort()
  }, ASSET_CACHE)

  expect(cached.some((p) => p.startsWith('/assets/') && p.endsWith('.js')), '应缓存 JS chunk').toBe(true)
  expect(cached.some((p) => p.startsWith('/assets/') && p.endsWith('.css')), '应缓存 CSS chunk').toBe(true)
  expect(cached, '应缓存 PWA 图标').toContain('/icons/pwa-192.png')
})

test('断网后仍能从缓存启动（shell + JS 都来自 Cache Storage）', async ({ page, context }) => {
  await page.goto('/')
  await waitForPrecache(page, 40)

  // 断网后重载：导航是 network-first，失败应回退到缓存的 '/'
  await context.setOffline(true)
  await page.reload()

  // #root 有子节点 = React 从缓存的 JS 真的启动起来了（不只是拿到 HTML 壳子）
  await expect(page.locator('#root > *').first()).toBeVisible({ timeout: 20_000 })

  // 恢复网络，避免影响后续用例
  await context.setOffline(false)
})

test('API 与跨域请求不进缓存（个人数据不做离线假象）', async ({ page }) => {
  await page.goto('/')
  await waitForPrecache(page, 40)

  const cached = await page.evaluate(async (name) => {
    const c = await window.caches.open(name)
    return (await c.keys()).map((r) => new URL(r.url).pathname)
  }, ASSET_CACHE)

  expect(cached.some((p) => p.startsWith('/api/')), '/api/ 不应被缓存').toBe(false)
})
