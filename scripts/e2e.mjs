import { chromium } from 'playwright'

/**
 * E2E 三条主线（M9 IA：/plan 已并入 /today 三卡切换）：
 *  1. 目标→任务→完成→进展→复盘→调整（周级闭环）
 *  2. Inbox 捕获→安排→日期条切次日（日级闭环）
 *  3. AI 建议→预览→确认→应用（mock /api/ai；未确认绝不落库）
 * 运行：node scripts/e2e.mjs（需 dev server :5188）
 */
const BASE = 'http://localhost:5188'
let failed = 0

function ok(cond, label) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`)
  if (!cond) failed += 1
}

async function freshPage(browser, seed = {}) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } })
  await ctx.addInitScript((s) => {
    // addInitScript 每次导航都会重跑：用「seed 标记键」做一次性守卫。
    // 首次：写入 seed（含 ob-done，跳过引导）；后续导航不再动 storage。
    if (!localStorage.getItem('epoch-e2e-seeded')) {
      localStorage.clear()
      localStorage.setItem('epoch-e2e-seeded', '1')
      localStorage.setItem('epoch-ob-done', '1')
      if (s && Object.keys(s).length) localStorage.setItem('epoch-data-v2', JSON.stringify({ state: s, version: 1 }))
    }
  }, seed)
  return ctx.newPage()
}

const run = async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })

  /* ── 主线 1：目标→任务→完成→进展→复盘→调整 ── */
  {
    const page = await freshPage(browser)
    await page.goto(`${BASE}/me`, { waitUntil: 'networkidle' })
    // 新建目标（M9：先展开「目标」折叠组，+ 在面板里）
    await page.locator('.me-group .row', { hasText: '目标' }).first().click()
    await page.waitForTimeout(300)
    await page.locator('[aria-label="新建目标"]').click()
    await page.locator('.sheet input').first().fill('上线 v1')
    await page.locator('.sheet button:has-text("保存")').click()
    await page.waitForTimeout(400)
    ok(await page.locator('.goal-row', { hasText: '上线 v1' }).count() === 1, 'E2E1 新建目标出现在 Me 列表')

    // 主页新建任务
    await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' })
    await page.locator('button[aria-label="新建"]').first().click()
    await page.waitForTimeout(400)
    ok((await page.locator('.sheet').count()) === 1, 'E2E1 打开任务 sheet')
    await page.locator('.sheet input').first().fill('写发布说明')
    await page.locator('.sheet button:has-text("保存")').click()
    await page.waitForTimeout(400)
    ok(await page.locator('.tl-row', { hasText: '写发布说明' }).count() === 1, 'E2E1 任务出现在时间轴')

    // 勾选完成 → 移出待办段（M9 过滤语义）
    await page.locator('.tl-row', { hasText: '写发布说明' }).getByRole('checkbox').click()
    await page.waitForTimeout(400)
    ok((await page.locator('.tl-row', { hasText: '写发布说明' }).count()) === 0, 'E2E1 完成后移出待办段')

    // Progress → 写复盘（oneThing 入收集箱）
    await page.goto(`${BASE}/progress`, { waitUntil: 'networkidle' })
    const inputs = page.locator('.wr-form input')
    await inputs.nth(0).fill('完成了设计系统')
    await inputs.nth(1).fill('被打断三次')
    await inputs.nth(2).fill('下周固定 20:00 写周报')
    await page.locator('button:has-text("保存并关闭")').click()
    await page.waitForTimeout(400)
    await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' })
    await page.locator('button[role="tab"]:has-text("收集箱")').click()
    await page.waitForTimeout(300)
    ok(await page.locator('.inbox-row', { hasText: '下周固定 20:00 写周报' }).count() >= 1, 'E2E1 oneThing 自动入收集箱（Review→Adjust）')
    await page.context().close()
  }

  /* ── 主线 2：Inbox 捕获→安排→日期条切次日 ── */
  {
    const page = await freshPage(browser)
    await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' })
    await page.locator('button[role="tab"]:has-text("收集箱")').click()
    await page.locator('.home-capture').fill('下周联系供应商')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(400)
    ok(await page.locator('.inbox-row', { hasText: '下周联系供应商' }).count() === 1, 'E2E2 捕获入收集箱')

    // 点行身 → 安排 sheet → 选明天 → 保存
    await page.locator('.inbox-row__body', { hasText: '下周联系供应商' }).click()
    await page.waitForTimeout(400)
    await page.locator('.sheet button:has-text("明天")').click()
    await page.locator('.sheet button:has-text("安排")').click()
    await page.waitForTimeout(400)
    // 日期条切到明天（选中日+1 = 第 4 格）→ 任务卡可见（无时间任务在"随时"段）
    await page.locator('.datenav__day').nth(3).click()
    await page.locator('button[role="tab"]:has-text("任务")').click()
    await page.locator('.home-card__filter .seg__btn:has-text("随时")').click()
    await page.waitForTimeout(300)
    ok(await page.locator('.tl-row', { hasText: '下周联系供应商' }).count() === 1, 'E2E2 日期条切到明天可见已排任务')
    await page.context().close()
  }

  /* ── 主线 3：AI 建议→预览→确认→应用（mock /api/ai）── */
  {
    const page = await freshPage(browser)
    await page.context().route('**/api/ai', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          proposals: [
            { id: 'p1', type: 'create_task', title: 'AI 建议的任务', time: '15:00', durMin: 30 },
          ],
        }),
      })
    })
    await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' })
    await page.locator('button[role="tab"]:has-text("收集箱")').click()
    await page.locator('.home-capture').fill('给 AI 的测试事项')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(400)
    await page.locator('button:has-text("AI 分拣收集箱")').click()
    await page.waitForTimeout(600)
    ok(await page.locator('.ai-item', { hasText: 'AI 建议的任务' }).count() === 1, 'E2E3 AI 建议出现在预览')
    // 预览阶段未落库（sheet 开着，直接查 store；persist 同步写）
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('epoch-data-v2'))?.state?.tasks?.length ?? 0)
    ok(before === 0, 'E2E3 预览阶段未落库')
    await page.locator('.ai-item button[type="button"]').first().click()
    await page.locator('button:has-text("应用所选")').click()
    await page.waitForTimeout(500)
    // AI 建议带 time=15:00 → 落在默认「待办」段
    await page.locator('button[role="tab"]:has-text("任务")').click()
    await page.waitForTimeout(300)
    ok(await page.locator('.tl-row', { hasText: 'AI 建议的任务' }).count() >= 1, 'E2E3 确认后落库到任务卡')
    await page.context().close()
  }

  /* ── 主线 4：手势——横滑翻卡 / 长按+横拖翻卡 / Sheet 下拖关闭 ── */
  {
    const gestureSeed = {
      direction: { statement: '', domains: [], wake: '07:00', sleep: '23:30', work: null },
      goals: [], routines: [],
      tasks: [{ id: 't9', title: '手势测试任务', tier: 'anytime', status: 'planned', date: null, time: null, durMin: null, urgent: false, completedAt: null, note: null, goalId: null, routineId: null, createdAt: '', updatedAt: '' }],
      habitLogs: [], inbox: [], reviews: {}, dayStats: {}, health: null, lastDay: new Date().toISOString().slice(0, 10),
    }
    const page = await freshPage(browser, gestureSeed)
    await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' })
    const vp = await page.locator('.spager__viewport').boundingBox()

    // 在 pager 内容区找一个「非按钮/输入」的拖拽起点（EmptyState 的动作按钮等合规忽略区要避开）
    const start = await page.evaluate((box) => {
      for (let dy = 8; dy < box.height - 8; dy += 6) {
        const el = document.elementFromPoint(box.x + box.width / 2, box.y + dy)
        if (!el) continue
        if (!el.closest('button, input, textarea, select, a, [role="checkbox"]') && el.closest('.spager__viewport')) {
          return { x: box.x + box.width / 2, y: box.y + dy }
        }
      }
      return { x: box.x + box.width / 2, y: box.y + 10 }
    }, vp)

    // 1) 横滑翻卡（非控件起点 → 下一页=事件）
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    for (let i = 1; i <= 10; i++) await page.mouse.move(start.x - i * 30, start.y)
    await page.mouse.up()
    await page.waitForTimeout(500)
    ok(await page.locator('button[role="tab"]:has-text("事件")').getAttribute('aria-selected') === 'true', 'E2E4 横滑翻到事件页')

    // 2) 长按 + 横拖（页顶空白先滑回任务页 → 再行上长按起点横拖去事件）
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    for (let i = 1; i <= 10; i++) await page.mouse.move(start.x + i * 30, start.y)
    await page.mouse.up()
    await page.waitForTimeout(500)
    // 长按行上起点 400ms+ 后横拖（pagerLock 使行左滑让位）；种子任务在随时段，先切过去
    await page.locator('.spager__page').nth(0).getByRole('tab', { name: '随时' }).click()
    await page.waitForTimeout(300)
    const row = await page.locator('.tl-row').first().boundingBox()
    await page.mouse.move(row.x + row.width / 2, row.y + row.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(500)
    for (let i = 1; i <= 10; i++) await page.mouse.move(row.x + row.width / 2 - i * 30, row.y + row.height / 2)
    await page.mouse.up()
    await page.waitForTimeout(500)
    ok(await page.locator('button[role="tab"]:has-text("事件")').getAttribute('aria-selected') === 'true', 'E2E4 长按+横拖翻卡（行上起点）')

    // 3) Sheet 下拖关闭（新建 → 拖柄下拖 200px）
    await page.locator('button[aria-label="新建"]').first().click()
    await page.waitForTimeout(500)
    ok((await page.locator('.sheet').count()) === 1, 'E2E4 Sheet 打开')
    const sheet = await page.locator('.sheet').boundingBox()
    await page.mouse.move(sheet.x + sheet.width / 2, sheet.y + 20)
    await page.mouse.down()
    for (let i = 1; i <= 10; i++) await page.mouse.move(sheet.x + sheet.width / 2, sheet.y + 20 + i * 25)
    await page.mouse.up()
    await page.waitForTimeout(500)
    ok((await page.locator('.sheet').count()) === 0, 'E2E4 Sheet 下拖关闭')
    await page.context().close()
  }

  await browser.close()
  console.log(failed === 0 ? 'E2E ALL PASS' : `E2E FAILED: ${failed}`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((e) => { console.error(e); process.exit(1) })
