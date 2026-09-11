/**
 * Phase 6 PR-4/5/6 · Playwright config
 * ──────────────────────────────────────
 * 3 个 project 家族：
 *  - a11y   : axe-core 扫 7 用户路由
 *  - e2e    : 3 条主线（目标闭环 / Inbox 次日 / AI 预览→确认→应用）
 *  - visual : 7 viewport (375/390/430/768/1024/1440/1920) × 6 用户路由 截图 + 像素 diff
 *
 * baseURL = http://localhost:4173（`npm run preview` 起生产 build）
 * CI 注入 VITE_AI_MOCK=1，e2e 主线 C 走 mock，不发真 LLM 请求。
 */

import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests',
  // 排除 legacy .mjs + vitest src/test + fixture 文件
  testMatch: /.*\.(spec|test)\.ts/,
  exclude: [
    '**/node_modules/**',
    'src/test/**',              // vitest 自己跑
    'tests/check-no-legacy-refs-fixture/**',  // 守门夹具
  ],
  reporter: process.env.CI
    ? [['list'], ['github']]
    : [['list']],
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: !process.env.CI,  // CI 关并行避免端口冲突
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview',
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  projects: [
    // ───── a11y ─────
    {
      name: 'a11y',
      testMatch: /a11y\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // ───── e2e 三主线 ─────
    {
      name: 'e2e',
      testMatch: /e2e\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // ───── visual 7 viewport ─────
    {
      name: 'visual',
      testMatch: /visual\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'vp-375',
      testMatch: /visual\/.*\.spec\.ts/,
      use: { ...devices['iPhone SE'] },  // 375x667
    },
    {
      name: 'vp-390',
      testMatch: /visual\/.*\.spec\.ts/,
      use: { ...devices['iPhone 13'] }, // 390x844
    },
    {
      name: 'vp-430',
      testMatch: /visual\/.*\.spec\.ts/,
      use: { viewport: { width: 430, height: 932 } },
    },
    {
      name: 'vp-768',
      testMatch: /visual\/.*\.spec\.ts/,
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'vp-1024',
      testMatch: /visual\/.*\.spec\.ts/,
      use: { viewport: { width: 1024, height: 768 } },
    },
    {
      name: 'vp-1440',
      testMatch: /visual\/.*\.spec\.ts/,
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'vp-1920',
      testMatch: /visual\/.*\.spec\.ts/,
      use: { viewport: { width: 1920, height: 1080 } },
    },
  ],
})
