import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } })
await ctx.addInitScript(() => {
  if (!localStorage.getItem('epoch-e2e-seeded')) {
    localStorage.clear(); localStorage.setItem('epoch-e2e-seeded', '1'); localStorage.setItem('epoch-ob-done', '1')
  }
})
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
await page.goto('http://localhost:5188/today', { waitUntil: 'networkidle' })
const vp = await page.locator('.spager__viewport').boundingBox()
console.log('viewport box:', JSON.stringify(vp))
await page.mouse.move(vp.x + vp.width / 2, vp.y + 10)
await page.mouse.down()
for (let i = 1; i <= 8; i++) await page.mouse.move(vp.x + vp.width / 2 - i * 30, vp.y + 10)
await page.mouse.up()
await page.waitForTimeout(500)
console.log('aria 事件:', await page.locator('button[role="tab"]:has-text("事件")').getAttribute('aria-selected'))
console.log('pager-x:', await page.evaluate(() => document.querySelector('.spager')?.style.getPropertyValue('--pager-x')))
await browser.close()
