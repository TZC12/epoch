import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } })
await ctx.addInitScript(() => {
  if (!localStorage.getItem('epoch-e2e-seeded')) {
    localStorage.clear(); localStorage.setItem('epoch-e2e-seeded', '1'); localStorage.setItem('epoch-ob-done', '1')
  }
})
const page = await ctx.newPage()
page.on('console', (m) => { if (m.text().startsWith('[G]')) console.log(m.text()) })
await page.goto('http://localhost:5188/today', { waitUntil: 'networkidle' })
// 在 viewport 元素上直接挂监听（React 之外），并劫持 --pager-x 写入探测
await page.evaluate(() => {
  const vp = document.querySelector('.spager__viewport')
  const root = document.querySelector('.spager')
  vp.addEventListener('pointerdown', (e) => {
    console.log('[G] vp pointerdown target=', e.target.className?.toString().slice(0, 30))
    const orig = root.style.setProperty.bind(root.style)
    root.style.setProperty = (k, v) => { console.log('[G] setProperty', k, v); orig(k, v) }
  }, { once: true })
})
const vp = await page.locator('.spager__viewport').boundingBox()
await page.mouse.move(vp.x + vp.width / 2, vp.y + 60)
await page.mouse.down()
for (let i = 1; i <= 10; i++) await page.mouse.move(vp.x + vp.width / 2 - i * 30, vp.y + 60)
await page.mouse.up()
await page.waitForTimeout(400)
console.log('pager-x:', await page.evaluate(() => document.querySelector('.spager')?.style.getPropertyValue('--pager-x')))
await browser.close()
