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
async function shot(url, path, { w = 430, h = 932, mode = null, full = false, clicks = [] } = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.addInitScript((s) => {
    if (!localStorage.getItem('epoch-e2e-seeded')) {
      localStorage.setItem('epoch-e2e-seeded', '1')
      localStorage.setItem('epoch-ob-done', '1')
      localStorage.setItem('epoch-data-v2', JSON.stringify({ state: s, version: 1 }))
    }
  }, seed)
  await page.goto(url, { waitUntil: 'networkidle' })
  for (const c of clicks) await page.locator(c.sel).first().click().catch(() => {})
  if (mode) { await page.evaluate((m) => { document.documentElement.dataset.mode = m }, mode); await page.waitForTimeout(400) }
  await page.screenshot({ path, fullPage: full })
  await page.close()
  console.log('shot', path)
}
await shot('http://localhost:5188/today', '.deploy/m9-1-home.png')
await shot('http://localhost:5188/today', '.deploy/m9-2-home-dark.png', { mode: 'dark' })
await shot('http://localhost:5188/today', '.deploy/m9-3-home-inbox.png', { clicks: ['button[role="tab"]:has-text("收集箱")'] })
await shot('http://localhost:5188/progress', '.deploy/m9-4-progress.png', { full: true })
await shot('http://localhost:5188/progress', '.deploy/m9-5-progress-week.png', { clicks: ['.dotmatrix .seg__btn:has-text("周")'] })
await shot('http://localhost:5188/me', '.deploy/m9-6-me.png', { full: true })
await browser.close()
