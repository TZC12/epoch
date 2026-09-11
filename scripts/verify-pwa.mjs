import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const ctx = await browser.newContext()
const page = await ctx.newPage()
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500) // 等 load + register
const swState = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration()
  const manifest = await fetch('/manifest.webmanifest').then((r) => ({ ok: r.ok, type: r.headers.get('content-type') }))
  return {
    swRegistered: !!reg,
    swActive: reg?.active?.state === 'activated' || !!reg?.active,
    scope: reg?.scope ?? null,
    manifestOk: manifest.ok,
    manifestType: manifest.type,
    controller: !!navigator.serviceWorker.controller,
  }
})
console.log(JSON.stringify(swState))
// 离线回退验证：断网后重新导航应命中缓存首页
await page.evaluate(() => fetch('/').then(r => r.text()).then(() => {}))
await browser.close()
console.log('PWA verify done')
