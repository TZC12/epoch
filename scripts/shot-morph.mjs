import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const seed = {
  direction: { statement: '', domains: [], wake: '07:00', sleep: '23:30', work: null },
  goals: [], routines: [], tasks: [
    { id: 't1', title: 'Run · 30 min', tier: 'main', status: 'completed', date: null, time: '07:30', durMin: 30, urgent: false, completedAt: new Date().toISOString(), note: null, goalId: null, routineId: null, createdAt: '', updatedAt: '' },
    { id: 't2', title: 'Deep work', tier: 'main', status: 'planned', date: null, time: '10:00', durMin: 120, urgent: false, completedAt: null, note: null, goalId: null, routineId: null, createdAt: '', updatedAt: '' },
  ],
  habitLogs: [], inbox: [], reviews: {}, dayStats: {}, health: null, lastDay: (d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)(new Date()),
}
const page = await browser.newPage({ viewport: { width: 430, height: 932 } })
await page.addInitScript((s) => {
  if (!localStorage.getItem('epoch-e2e-seeded')) {
    localStorage.setItem('epoch-e2e-seeded', '1')
    localStorage.setItem('epoch-ob-done', '1')
    localStorage.setItem('epoch-data-v2', JSON.stringify({ state: s, version: 1 }))
  }
}, seed)
await page.goto('http://localhost:5188/today', { waitUntil: 'networkidle' })
// 特写：一行完成前/后（点击勾选后立即抓形变中间态 + 终态）
const row = page.locator('.spager__page').nth(0).locator('.tl-row', { hasText: 'Deep work' })
const before = await row.locator('.cc__dot').boundingBox()
await page.screenshot({ path: '.deploy/mp-1-idle.png', clip: { x: before.x - 30, y: before.y - 20, width: 200, height: 80 } })
await row.getByRole('checkbox').click()
await page.waitForTimeout(120) // 形变中间帧
await page.screenshot({ path: '.deploy/mp-2-morphing.png', clip: { x: before.x - 30, y: before.y - 20, width: 200, height: 80 } })
await page.waitForTimeout(600) // 终态
await page.screenshot({ path: '.deploy/mp-3-done.png', clip: { x: before.x - 30, y: before.y - 20, width: 200, height: 80 } })
// 全页
await page.screenshot({ path: '.deploy/mp-4-home.png' })
await browser.close()
console.log('done')
