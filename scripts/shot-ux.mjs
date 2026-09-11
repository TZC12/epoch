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
  habitLogs: [], inbox: [{ id: 'i1', title: '联系供应商', hint: null, status: 'open', source: 'capture', convertedTaskId: null, createdAt: '' }],
  reviews: {}, dayStats: {}, health: null, lastDay: (d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)(new Date()),
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
  await p.goto('http://localhost:5188/today', { waitUntil: 'networkidle' })
  if (mode) { await p.evaluate((m) => { document.documentElement.dataset.mode = m }, mode); await p.waitForTimeout(400) }
  return p
}
// 1) 主页浅色（新结构）
let p = await page()
await p.screenshot({ path: '.deploy/u1-home.png' })
await p.close()
// 2) 主页深色
p = await page('dark')
await p.screenshot({ path: '.deploy/u2-home-dark.png' })
await p.close()
// 3) 任务 sheet（G1-G4 字段组，tall）
p = await page()
await p.locator('.home-fab button').click()
await p.waitForTimeout(600)
await p.screenshot({ path: '.deploy/u3-sheet.png' })
await p.close()
// 4) Sheet 拖拽中状态（下拖 120px 截图，验证跟手+scrim 减淡）
p = await page()
await p.locator('.home-fab button').click()
await p.waitForTimeout(600)
const sh = await p.locator('.sheet').boundingBox()
await p.mouse.move(sh.x + sh.width / 2, sh.y + 16)
await p.mouse.down()
for (let i = 1; i <= 8; i++) await p.mouse.move(sh.x + sh.width / 2, sh.y + 16 + i * 15)
await p.screenshot({ path: '.deploy/u4-sheet-drag.png' })
await p.mouse.up()
await p.close()
// 5) Progress（天气卡在页首）
p = await browser.newPage({ viewport: { width: 430, height: 932 } })
await p.addInitScript((s) => {
  if (!localStorage.getItem('epoch-e2e-seeded')) {
    localStorage.setItem('epoch-e2e-seeded', '1')
    localStorage.setItem('epoch-ob-done', '1')
    localStorage.setItem('epoch-data-v2', JSON.stringify({ state: s, version: 1 }))
  }
}, seed)
await p.goto('http://localhost:5188/progress', { waitUntil: 'networkidle' })
await p.screenshot({ path: '.deploy/u5-progress-top.png' })
await p.close()
await browser.close()
console.log('done')
