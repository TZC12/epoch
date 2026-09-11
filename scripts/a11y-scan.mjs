import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage({ viewport: { width: 430, height: 932 } })
await page.goto('http://localhost:5188/today', { waitUntil: 'networkidle' })
const report = await page.evaluate(() => {
  const out = { iconOnlyNoLabel: [], buttonsTotal: 0, unlabeledIconButtons: 0, navSemantic: !!document.querySelector('nav'), langAttr: document.documentElement.lang, touchSmall: [] }
  for (const btn of document.querySelectorAll('button')) {
    out.buttonsTotal++
    const label = (btn.getAttribute('aria-label') || btn.textContent || '').trim()
    const iconOnly = btn.querySelectorAll('svg').length > 0 && (btn.textContent || '').trim() === ''
    if (iconOnly && !btn.getAttribute('aria-label')) { out.unlabeledIconButtons++; out.iconOnlyNoLabel.push(btn.className || btn.outerHTML.slice(0, 80)) }
    const r = btn.getBoundingClientRect()
    if (r.width > 0 && r.height > 0 && (r.width < 32 || r.height < 24) && !btn.closest('.sheet')) out.touchSmall.push(`${btn.className} ${Math.round(r.width)}x${Math.round(r.height)}`)
  }
  const headings = document.querySelectorAll('h1,h2,h3').length
  return { ...out, headings }
})
console.log(JSON.stringify(report, null, 1))
// 三页抽查
for (const path of ['/plan', '/progress', '/me']) {
  await page.goto(`http://localhost:5188${path}`, { waitUntil: 'networkidle' })
  const r2 = await page.evaluate(() => {
    let unlabeled = 0
    for (const btn of document.querySelectorAll('button')) {
      const iconOnly = btn.querySelectorAll('svg').length > 0 && (btn.textContent || '').trim() === ''
      if (iconOnly && !btn.getAttribute('aria-label')) unlabeled++
    }
    return { unlabeled, h1: !!document.querySelector('h1') }
  })
  console.log(path, JSON.stringify(r2))
}
await browser.close()
