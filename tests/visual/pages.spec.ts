/**
 * LEAN-PERF 基线 · 视觉回归（7 视口 × 4 路由）
 * ────────────────────────────────────────────
 * 确定性三要素（缺一不可，否则基线每天都在漂）：
 *  1. page.clock 冻结到 2026-09-17T09:00（日期/进度/热力图全部依赖"今天"）
 *  2. localStorage 预置 epoch-data-v2 + epoch-theme=light（避免 system 档随环境变）
 *  3. screenshot({ animations: 'disabled' }) + document.fonts.ready（防动画/字体半途截帧）
 *
 * 运行：先 `npx vite build`，再 `npx vite preview --port 4173`，最后
 *   npx playwright test --project=visual --project=vp-375 --project=vp-390 --project=vp-430 \
 *     --project=vp-768 --project=vp-1024 --project=vp-1440 --project=vp-1920
 * 首次生成基线：追加 --update-snapshots；之后任何 diff 必须人工确认后才允许更新。
 */

import { test, expect, type Page } from '@playwright/test'

const FROZEN_ISO = '2026-09-17T09:00:00.000+08:00'
const FROZEN = new Date(FROZEN_ISO)

/** 预置确定性数据：写入 zustand persist 的真实键名与 v2 数据形状。 */
const SEED = {
  'epoch-data-v2': {
    state: {
      direction: {
        statement: '成为说西语的人',
        domains: ['语言', '健康'],
        wake: '07:00',
        sleep: '23:00',
        work: '09:00-18:00',
      },
      goals: [
        {
          id: 'g_demo_1',
          title: '学会西班牙语',
          kicker: 'B1 → B2 · 90 天',
          note: null,
          focus: '每日 15 分钟听力',
          next: '完成第 3 单元',
          ladder: [
            { lv: 'Quarter', t: '完成 A2 教材', cur: true },
            { lv: 'Month', t: '每天 15 分钟', cur: false },
          ],
          status: 'active',
          createdAt: '2026-08-01T09:00:00.000Z',
          updatedAt: '2026-09-10T09:00:00.000Z',
        },
        {
          id: 'g_demo_2',
          title: '每周三次力量训练',
          kicker: '健康基线',
          note: null,
          focus: null,
          next: null,
          ladder: [],
          status: 'paused',
          createdAt: '2026-07-01T09:00:00.000Z',
          updatedAt: '2026-09-01T09:00:00.000Z',
        },
      ],
      routines: [
        {
          id: 'r_demo_1',
          goalId: 'g_demo_1',
          name: '听力 15 分钟',
          sub: '通勤路上',
          frequency: null,
          time: '08:00',
          durMin: 15,
          kind: 'habit',
          archived: false,
          createdAt: '2026-08-01T09:00:00.000Z',
          updatedAt: '2026-09-01T09:00:00.000Z',
        },
        {
          id: 'r_demo_2',
          goalId: null,
          name: '冥想',
          sub: null,
          frequency: null,
          time: '22:30',
          durMin: 10,
          kind: 'habit',
          archived: false,
          createdAt: '2026-08-01T09:00:00.000Z',
          updatedAt: '2026-09-01T09:00:00.000Z',
        },
      ],
      tasks: [
        {
          id: 't_demo_1',
          title: '每日 15 分钟西语听力',
          tier: 'main',
          status: 'planned',
          date: '2026-09-17',
          time: '08:00',
          durMin: 15,
          urgent: false,
          category: 'study',
          completedAt: null,
          note: null,
          goalId: 'g_demo_1',
          routineId: 'r_demo_1',
          createdAt: '2026-09-16T22:00:00.000Z',
          updatedAt: '2026-09-16T22:00:00.000Z',
        },
        {
          id: 't_demo_2',
          title: '整理季度复盘材料',
          tier: 'block',
          status: 'scheduled',
          date: '2026-09-17',
          time: '14:00',
          durMin: 60,
          urgent: true,
          category: 'work',
          completedAt: null,
          note: null,
          goalId: null,
          routineId: null,
          createdAt: '2026-09-16T22:00:00.000Z',
          updatedAt: '2026-09-16T22:00:00.000Z',
        },
        {
          id: 't_demo_3',
          title: '散步 20 分钟',
          tier: 'anytime',
          status: 'completed',
          date: '2026-09-17',
          time: null,
          durMin: 20,
          urgent: false,
          category: 'life',
          completedAt: '2026-09-17T01:30:00.000Z',
          note: null,
          goalId: null,
          routineId: null,
          createdAt: '2026-09-16T22:00:00.000Z',
          updatedAt: '2026-09-17T01:30:00.000Z',
        },
      ],
      habitLogs: [
        { id: 'lg_1', routineId: 'r_demo_1', date: '2026-09-17', value: 1, createdAt: '2026-09-17T00:30:00.000Z' },
        { id: 'lg_2', routineId: 'r_demo_1', date: '2026-09-16', value: 1, createdAt: '2026-09-16T00:30:00.000Z' },
        { id: 'lg_3', routineId: 'r_demo_2', date: '2026-09-15', value: 1, createdAt: '2026-09-15T14:30:00.000Z' },
      ],
      inbox: [
        {
          id: 'inb_1',
          title: '读《思考，快与慢》第 3 章',
          hint: '朋友推荐',
          status: 'open',
          source: 'capture',
          convertedTaskId: null,
          createdAt: '2026-09-16T10:00:00.000Z',
        },
      ],
      reviews: {},
      dayStats: {
        '2026-09-16': { done: 3, total: 4, urgent: false },
        '2026-09-15': { done: 2, total: 3, urgent: true },
        '2026-09-14': { done: 4, total: 5, urgent: false },
        '2026-09-13': { done: 1, total: 2, urgent: false },
      },
      health: null,
      fitSessions: [],
      fitToday: null,
      learnLangs: [],
      learnActive: null,
      learnEntries: [],
      learnWords: [],
      notes: [],
      healthDays: {},
      lastDay: '2026-09-17',
    },
    version: 2,
  },
  'epoch-theme': { state: { mode: 'light' }, version: 0 },
}

const ROUTES = ['/today', '/progress', '/me'] as const

async function prepare(page: Page) {
  // addInitScript 在每个新文档创建时第一时间运行，AppShell.useState(() => needOnboarding())
  // 读 localStorage 时一定能看到 OB_KEY。对象字面量入参会被 Playwright 序列化为
  // init script 的参数；OB_KEY 是裸字符串，独立写。
  await page.addInitScript((seed: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, JSON.stringify(v))
    localStorage.setItem('epoch-ob-done', '1')
    // NetBackground 测试钩子：基线不需要粒子层随机分布。
    ;(window as unknown as { __EPOCH_TEST_NO_BG__?: boolean }).__EPOCH_TEST_NO_BG__ = true
  }, SEED)
  // 外部网络一律阻断：Supabase（.env 有真 key）与天气 API 的现实延迟会让
  // networkidle 与渲染结果不可复现，基线必须落在"无后端降级态"上。
  await page.route(/.*(supabase\.co|open-meteo\.com|geolocation).*/, (route) => route.abort())
  // Playwright 内置时钟：固定 Date 构造与 Date.now 到 frozen 时刻。
  // 不要 pauseAt——React 调度/effects 需要时间流动到完成首屏。
  await page.clock.install({ time: FROZEN })
  await page.emulateMedia({ reducedMotion: 'reduce' })
}

async function shoot(page: Page, route: string, name: string) {
  await page.goto(route)
  await page.waitForLoadState('load')
  await page.evaluate(() => document.fonts.ready)
  // 锚定元素：每个路由等待一个稳定出现的、由 seed 数据驱动的真实节点，
  // 再多等 200ms 让布局 settle。基线不再依赖固定 timeout，避免大视口被
  // 渲染管线还没结束就截图。
  const anchor = route === '/today'
    ? 'main >> text=每日 15 分钟西语听力'
    : route === '/progress'
    ? 'main >> text=学会西班牙语'
    : 'main >> text=成为说西语的人'
  await page.locator(anchor).first().waitFor({ state: 'visible', timeout: 10_000 })
  await page.waitForTimeout(200)
  // 0.2% 容差：吸收 chromium 字体栅格化抖动（实测同 build 二次运行会有
  // ~0.1-0.18% 像素差异，来自 subpixel AA 不可复现）；仍是真实布局/颜色
  // 变化（任何色温或位移都会 >0.1%）的强信号闸。
  await expect(await page.screenshot({ fullPage: true, animations: 'disabled' })).toMatchSnapshot(`${name}.png`, { maxDiffPixelRatio: 0.002 })
}

for (const route of ROUTES) {
  const slug = route.replace(/^\//, '').replace(/\//g, '-') || 'root'
  test(`视觉基线 ${route}`, async ({ page }) => {
    await prepare(page)
    await shoot(page, route, slug)
  })
}
