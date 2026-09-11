import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * PWA 门（文件级断言；SW 行为无法在 jsdom 跑，真浏览器验证走 e2e/人工）：
 *  - manifest 存在且接线 index.html；图标文件真实存在；
 *  - sw.js 存在且带版本号缓存名（升策略必须升版本）；
 *  - SW 仅生产注册（dev 不注册，防 HMR 缓存干扰）。
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8')
const sw = readFileSync(join(root, 'public/sw.js'), 'utf8')
const main = readFileSync(join(root, 'src/main.tsx'), 'utf8')

describe('PWA（manifest + SW）', () => {
  it('index.html 接线 manifest + apple-touch-icon', () => {
    expect(indexHtml).toContain('rel="manifest" href="/manifest.webmanifest"')
    expect(indexHtml).toContain('rel="apple-touch-icon" href="/icons/apple-touch-icon.png"')
    expect(existsSync(join(root, 'public/manifest.webmanifest'))).toBe(true)
    expect(existsSync(join(root, 'public/icons/apple-touch-icon.png'))).toBe(true)
  })

  it('manifest：standalone + 图标三项齐全', () => {
    const m = JSON.parse(readFileSync(join(root, 'public/manifest.webmanifest'), 'utf8'))
    expect(m.display).toBe('standalone')
    expect(m.icons.length).toBeGreaterThanOrEqual(3)
    for (const icon of m.icons) expect(existsSync(join(root, 'public', icon.src))).toBe(true)
    expect(m.start_url).toBe('/')
  })

  it('sw.js：版本化缓存 + activate 清旧 + 不缓存 API/跨域', () => {
    expect(sw).toMatch(/const VERSION = 'v\d+'/)
    expect(sw).toContain("caches.delete(k)")
    expect(sw).toContain("url.pathname.startsWith('/api/')")
    expect(sw).toContain("url.origin !== self.location.origin")
    expect(sw).toContain("req.mode === 'navigate'")
  })

  it('SW 仅生产注册（dev 跳过）', () => {
    expect(main).toContain("import.meta.env.PROD && 'serviceWorker' in navigator")
  })
})
