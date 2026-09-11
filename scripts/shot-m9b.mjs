import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const seed = {
  direction: { statement: '成为把想法做成产品的人', domains: ['Health', 'Craft'], wake: '07:00', sleep: '23:30', work: null },
  goals: [{ id: 'g1', title: '产品上线的第一个版本', kicker: 'Quarter', note: null, focus: null, next: null, ladder: [], status: 'active', createdAt: '', updatedAt: '' }],
  routines: [{ id: 'r1', goalId: 'g1', name: 'Posture', sub: '5 min', frequency: null, time: '08:00', durMin: 5, kind: 'habit', archived: false, createdAt: '', updatedAt: '' }],
  tasks: [
    { id: 't1', title: 'Run · 30 min', tier: 'main', status: 'completed', date: null, time: '07:30', durMin: 30, urgent: false, completedAt: new Date().toISOString(), note: null, goalId: 'g1', routineId: null, createdAt: '', updatedAt: '' },
    { id: 't2', title: 'Deep work：设计系统', tier: 'main', status: 'planned', date: null, time: '10:00', durMin: 120, urgent: false, completedAt: null, note: null, goalId: 'g1', routineId: null, createdAt: '', updatedAt: '' },
    { id: 't3', title: 'Learn · Product Design', tier: 'anytime', status: 'planned', date: null, time: null, durMin: 45, urgent: true, completedAt: null, note: null, goalId: null, routineId: null, createdAt: '', updatedAt: '' },
    { id: 't4', title: '团队周会', tier: 'block', status: 'planned', date: null, time: '15:00', durMin: 60, urgent: false, completedAt: null, note: '准备演示', goalId: null, routineId: null, createdAt: '', updatedAt: '' },
  ],
  habitLogs: [], inbox: [
    { id: 'i1', title: '联系供应商', hint: null, status: 'open', source: 'capture', convertedTaskId: null, createdAt: '' },
  ],
  reviews: {}, dayStats: Object.fromEntries(Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (i + 1))
    const k = d.toISOString().slice(0, 10)
    const mode = i % 4
    return [k, mode === 0 ? { done: 0, total: 3, urgent: false } : mode === 1 ? { done: 1, total: 3, urgent: false } : { done: 2 + (i % 3), total: 4, urgent: false }]
  })), health: null, lastDay: new Date().toISOString().slice(0, 10),
}
async function page(mode = null) {
  const p = await browser.newPage({ viewport: { width: 430, height: 932 } })
  await p.addInitScript((s) => {
    if (!localStorage.getItem('epoch-e2e-seeded')) {
      localStorage.setItem('epoch-e2e-seeded', '1')
      localStorage.setItem('epoch-ob-done', '1')
      localStorage.setItem('epoch-data-v2', JSON.stringify({ state: s, version: 1 }))
    }
  }, seed)
  await p.goto('http://localhost:5188/progress', { waitUntil: 'networkidle' })
  await p.waitForTimeout(600)
  if (mode) { await p.evaluate((m) => { document.documentElement.dataset.mode = m }, mode); await p.waitForTimeout(300) }
  return p
}
// 1) 收集箱卡（主页第三卡，用 E2E 同款选择器 + 等待）
let p = await page()
await p.goto('http://localhost:5188/today', { waitUntil: 'networkidle' })
await p.waitForTimeout(500)
const tab = p.locator('button[role="tab"]:has-text("收集箱")')
await tab.waitFor({ state: 'visible', timeout: 8000 })
await tab.click()
await p.waitForTimeout(500)
await p.screenshot({ path: '.deploy/m9r-1-inbox.png' })
await p.close()
// 2) 周粒度（等 lazy chunk 挂载再点）
p = await page()
const wkBtn = p.locator('.dotmatrix .seg__btn', { hasText: '周' })
await wkBtn.waitFor({ state: 'visible', timeout: 8000 })
await wkBtn.click()
await p.waitForTimeout(500)
await p.screenshot({ path: '.deploy/m9r-2-week.png' })
await p.close()
// 3) 修复后日视图点阵（稀疏标签）
p = await page()
await p.locator('.dotmatrix').screenshot({ path: '.deploy/m9r-3-dotmatrix.png' })
await p.close()
// 4) 复盘表单视口滚动证据（证 fullPage 导航伪影）
p = await page()
await p.locator('.wr-form').scrollIntoViewIfNeeded()
await p.waitForTimeout(300)
await p.screenshot({ path: '.deploy/m9r-4-review-viewport.png' })
await p.close()
// 5) Me 修复后指标（累计=dayStats 派生）
p = await page()
await p.goto('http://localhost:5188/me', { waitUntil: 'networkidle' })
await p.waitForTimeout(400)
await p.screenshot({ path: '.deploy/m9r-5-me.png' })
await p.close()
await browser.close()
console.log('done')
