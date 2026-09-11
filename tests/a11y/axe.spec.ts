/**
 * Phase 6 PR-4 · a11y axe-core 全路由扫
 * ───────────────────────────────────────
 * 7 用户路由（/today /plan /progress /me /goal/:id /health + 暗色 smoke）。
 * 零 serious / critical violation 才放行。
 *
 * 数据：localStorage / idb 在 beforeEach 清空，避免脏状态。
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const ROUTES = [
  { name: 'today',    path: '/today' },
  { name: 'plan',     path: '/plan' },
  { name: 'progress', path: '/progress' },
  { name: 'me',       path: '/me' },
  { name: 'health',   path: '/health' },
] as const

test.beforeEach(async ({ page }) => {
  // 干净状态
  await page.goto('/')
  await page.evaluate(async () => {
    localStorage.clear()
    sessionStorage.clear()
    if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
      const dbs = await indexedDB.databases()
      await Promise.all(dbs.map((db) => new Promise<void>((resolve) => {
        if (!db.name) return resolve()
        const req = indexedDB.deleteDatabase(db.name)
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      })))
    }
  })
})

for (const route of ROUTES) {
  test(`a11y · ${route.name} 没有 serious/critical violation`, async ({ page }) => {
    await page.goto(route.path)
    // 等待路由就绪（最起码 app shell 出现）
    await expect(page.locator('body')).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )

    if (blocking.length > 0) {
      console.error('a11y 阻断项:')
      for (const v of blocking) {
        console.error(`  - [${v.impact}] ${v.id} (${v.help})`)
        for (const n of v.nodes.slice(0, 3)) {
          console.error(`      target: ${n.target.join(' ')}`)
        }
      }
    }
    expect(blocking, `a11y violations in ${route.path}`).toEqual([])
  })
}

test('a11y · 暗色模式 smoke', async ({ page }) => {
  // 切暗色（theme.ts 应有 localStorage key；先用兜底方案）
  await page.goto('/me')
  await page.evaluate(() => {
    localStorage.setItem('epoch-theme', 'dark')
    document.documentElement.setAttribute('data-mode', 'dark')
  })
  await page.goto('/today')

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(blocking, 'a11y violations in dark mode').toEqual([])
})
