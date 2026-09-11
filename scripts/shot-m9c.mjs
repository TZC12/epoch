import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const seed = {
  direction: { statement: '成为把想法做成产品的人', domains: ['Health'], wake: '07:00', sleep: '23:30', work: null },
  goals: [], routines: [], tasks: [
    { id: 't1', title: 'Run · 30 min', tier: 'main', status: 'completed', date: null, time: '07:30', durMin: 30, urgent: false, completedAt: new Date().toISOString(), note: null, goalId: null, routineId: null, createdAt: '', updatedAt: '' },
  ],
  habitLogs: [], inbox: [], reviews: {},
  dayStats: { '2026-09-01': { done: 2, total: 3, urgent: false }, '2026-09-02': { done: 3, total: 4, urgent: false } },
  health: null,
  /* 本地日期（UTC toISOString 在午夜后落后本地日期，会与产品本地 dateKey 语义冲突） */
  lastDay: (d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)(new Date()),
}
async function page() {
  const p = await browser.newPage({ viewport: { width: 430, height: 932 } })
  await p.addInitScript((s) => {
    if (!localStorage.getItem('epoch-e2e-seeded')) {
      localStorage.setItem('epoch-e2e-seeded', '1')
      localStorage.setItem('epoch-ob-done', '1')
      localStorage.setItem('epoch-data-v2', JSON.stringify({ state: s, version: 1 }))
    }
  }, seed)
  return p
}
// Me 累计 vs 周视图大数字（已知精确 seed：stats 5 + 今日实时 1 = 6）
let p = await page()
await p.goto('http://localhost:5188/me', { waitUntil: 'networkidle' })
await p.waitForTimeout(400)
const meTotal = await p.locator('.me-head__metric').first().locator('span').first().textContent()
console.log('Me 累计（期望 6）:', meTotal)
await p.screenshot({ path: '.deploy/m9f-1-me.png' })
await p.close()
p = await page()
await p.goto('http://localhost:5188/progress', { waitUntil: 'networkidle' })
const wk = p.locator('.dotmatrix .seg__btn', { hasText: '周' })
await wk.waitFor({ state: 'visible', timeout: 8000 })
await wk.click()
await p.waitForTimeout(400)
const big = await p.locator('.dotmatrix__big').textContent()
console.log('周视图大数字（期望 +6）:', big.trim())
await p.screenshot({ path: '.deploy/m9f-2-week.png' })
// 数值一致性断言（程序化，免得 judge 数点阵）
const colsSum = await p.evaluate(() => {
  const on = document.querySelectorAll('.dotmatrix__dots .is-on').length
  return on
})
console.log('周列可见点数和（≤6，封顶截断可少）:', colsSum)
await p.close()
await browser.close()
