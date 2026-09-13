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
// 切到已完成段（Run 已完成 → check 形变可见）
await page.locator('.spager__page').nth(0).getByRole('tab', { name: '已完成' }).click()
await page.waitForTimeout(300)
const row = page.locator('.spager__page').nth(0).locator('.tl-row', { hasText: 'Run' })
const box = await row.locator('.cc__dot').boundingBox()
const clip = { x: box.x - 40, y: box.y - 24, width: 220, height: 88 }
await page.screenshot({ path: '.deploy/mp-5-done.png', clip })          // 终态：◉+✓
await row.getByRole('checkbox').click()                                  // 撤销 → 形变回 ○（中间帧）
await page.waitForTimeout(130)
await page.screenshot({ path: '.deploy/mp-6-morphing.png', clip })
await page.waitForTimeout(600)
await page.screenshot({ path: '.deploy/mp-7-idle.png', clip })
await browser.close()
console.log('done')
