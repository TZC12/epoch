import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } })
await ctx.addInitScript(() => {
  if (!localStorage.getItem('epoch-e2e-seeded')) {
    localStorage.clear(); localStorage.setItem('epoch-e2e-seeded', '1'); localStorage.setItem('epoch-ob-done', '1')
  }
  // 页面级事件日志（capture 阶段，pointer 流全可见）
  window.__log = []
  document.addEventListener('pointerdown', (e) => window.__log.push(['down', e.pointerId, e.clientX, e.clientY, e.target.className?.toString().slice(0, 40)]), true)
  document.addEventListener('pointermove', (e) => { if (window.__log.filter(l => l[0] === 'move').length < 3 || window.__log.length % 4 === 0) window.__log.push(['move', e.clientX, e.clientY]) }, true)
  document.addEventListener('pointerup', (e) => window.__log.push(['up', e.clientX, e.clientY]), true)
})
const page = await ctx.newPage()
await page.goto('http://localhost:5188/today', { waitUntil: 'networkidle' })
const vp = await page.locator('.spager__viewport').boundingBox()
const start = await page.evaluate((box) => {
  for (let dy = 8; dy < box.height - 8; dy += 6) {
    const el = document.elementFromPoint(box.x + box.width / 2, box.y + dy)
    if (el && !el.closest('button, input, textarea, select, a') && el.closest('.spager__viewport')) return { x: box.x + box.width / 2, y: box.y + dy, tag: el.className.toString().slice(0, 40) }
  }
  return null
}, vp)
console.log('start:', JSON.stringify(start))
await page.mouse.move(start.x, start.y)
await page.mouse.down()
for (let i = 1; i <= 10; i++) await page.mouse.move(start.x - i * 30, start.y)
await page.mouse.up()
await page.waitForTimeout(500)
console.log('pager-x:', await page.evaluate(() => document.querySelector('.spager')?.style.getPropertyValue('--pager-x')))
console.log('log:', JSON.stringify((await page.evaluate(() => window.__log)).slice(0, 18)))
await browser.close()
