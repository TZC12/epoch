import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const seed = {
  direction: { statement: '', domains: [], wake: '07:00', sleep: '23:30', work: null },
  goals: [], routines: [], tasks: [
    { id: 't1', title: 'Run · 30 min', tier: 'main', status: 'completed', date: null, time: '07:30', durMin: 30, urgent: false, completedAt: new Date().toISOString(), note: null, goalId: null, routineId: null, createdAt: '', updatedAt: '' },
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
await page.locator('button[role="tab"]:has-text("事件")').click()
await page.waitForTimeout(300)
const row = page.locator('.spager__page').nth(1).locator('.tl-row').first()
const box = await row.locator('.cc__dot').boundingBox()
console.log('box:', JSON.stringify(box))
const clip = { x: box.x - 40, y: box.y - 24, width: 220, height: 88 }
console.log('clip:', JSON.stringify(clip))
await page.screenshot({ path: '.deploy/mp-8-before.png', clip })
await row.getByRole('checkbox').click()
await page.waitForTimeout(130)
await page.screenshot({ path: '.deploy/mp-9-mid.png', clip })
await page.waitForTimeout(600)
await page.screenshot({ path: '.deploy/mp-10-after.png', clip })
await browser.close()
console.log('done')
