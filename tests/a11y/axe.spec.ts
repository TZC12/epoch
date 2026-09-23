/**
 * Phase 6 PR-4 · a11y axe-core 全路由扫
 * ───────────────────────────────────────
 * 4 用户路由（/today /progress /me /health + 暗色 smoke）。注：/plan 已重定向到 /today（M9 IA）；/goal/:id 由 dynamic page 自行 a11y，不在 axe 全量扫里。
 * 零 serious / critical violation 才放行。
 *
 * 数据：localStorage / idb 在 beforeEach 清空，避免脏状态。
 */

import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * 等入场动画跑完再扫。
 * Panel/Sheet 有 `panel-in`（opacity 0→1，--dur-4）这类入场动画；动画中途
 * 扫 axe，半透明文字会被判成 color-contrast 严重违规（实测 1.3:1 的"未连接
 * 空状态文案"就是这么来的）。这是时序误报，不是产品缺陷——动画结束后对比度正常。
 * NetBackground 是 canvas + rAF（JS），不进 document.getAnimations()，不会卡住。
 */
async function settle(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () => (document.getAnimations?.() ?? []).every((a) => a.playState !== 'running'),
      undefined,
      { timeout: 5_000 },
    )
    .catch(() => {}) // 兜底：不支持 getAnimations 或超时就照常扫
  await page.waitForTimeout(120)
}

const ROUTES = [
  { name: 'today',    path: '/today' },
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
    await settle(page)

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
          console.error(`      why: ${(n.failureSummary ?? '').replace(/\n/g, ' | ')}`)
        }
      }
    }
    expect(blocking, `a11y violations in ${route.path}`).toEqual([])
  })
}

test('a11y · 暗色模式 smoke', async ({ page }) => {
  // 必须用 zustand persist 的真实存储形状：{state:{mode},version}。
  // 之前写的裸字符串 'dark' 会被 persist 当无效值丢弃 → theme 仍按 system 解析成浅色，
  // 于是这条"暗色 smoke"其实一直在扫浅色，等于没覆盖。
  await page.goto('/me')
  await page.evaluate(() => {
    localStorage.setItem('epoch-theme', JSON.stringify({ state: { mode: 'dark' }, version: 0 }))
  })
  await page.goto('/today')
  // 确认真的进了暗色，否则这条断言是假绿
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark', { timeout: 5_000 })
  await settle(page)

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  if (blocking.length > 0) {
    console.error('a11y 暗色阻断项:')
    for (const v of blocking) {
      console.error(`  - [${v.impact}] ${v.id}`)
      for (const n of v.nodes.slice(0, 5)) {
        console.error(`      target: ${n.target.join(' ')}`)
        console.error(`      why: ${(n.failureSummary ?? '').replace(/\n/g, ' | ')}`)
      }
    }
  }
  expect(blocking, 'a11y violations in dark mode').toEqual([])
})
