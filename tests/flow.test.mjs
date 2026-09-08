/* M1 数据统一闭环验收 — 捕获→安排→已排 / 旧数据迁移 / 主题持久化 / 死数组不存在
 * 运行：node tests/flow.test.mjs
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'legacy.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true });
const w = dom.window;
const d = w.document;
w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log('  ✔ ' + name); } else { fail++; console.log('  ✘ ' + name); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
await sleep(1100);
const S = () => w.__epoch.state;
const tomorrowKey = () => { const dt = new Date(); dt.setDate(dt.getDate() + 1); return w.dateKey(dt); };

console.log('— 单一事实来源：死数组已删除 —');
t('state.week 不存在', !('week' in S()));
t('state.upcoming 不存在', !('upcoming' in S()));
t('state.unscheduled 不存在', !('unscheduled' in S()));
t('state.secondary 不存在（已并入 tasks）', !('secondary' in S()));
t('随时任务在 tasks 中（tier=anytime）', S().tasks.some(x => x.tier === 'anytime'));

console.log('— 快速捕获（Inbox 的主动入口） —');
w.goTab('plan'); await sleep(50);
const cap = d.getElementById('cap-in');
t('捕获输入框存在', !!cap);
const inboxBefore = S().inbox.length;
cap.value = '给/vendors 回一封邮件';
cap.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
await sleep(60);
t('回车后收集箱 +1', S().inbox.length === inboxBefore + 1);
t('新条目在列表顶部可见', d.querySelector('#plan-list')?.textContent.includes('给/vendors 回一封邮件'));
t('输入框已清空', cap.value === '');
t('其他分段捕获后自动切回收集箱', d.querySelector('#plan-seg [data-seg="inbox"]')?.classList.contains('on'));
cap.value = '再记一件小事';
cap.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
await sleep(40);
t('连续捕获可用', S().inbox.length === inboxBefore + 2);

console.log('— 安排：收集箱 → 真实日期任务（Schedule 桥） —');
const item = S().inbox[0];
d.querySelector(`#plan-list [data-plan-item="${item.id}"]`)?.click(); await sleep(80);
t('点击收集箱项打开改期弹层', d.querySelector('#sheet-rs')?.classList.contains('on'));
const rsOpts = d.querySelectorAll('#rs-list .item');
t('改期选项为 4 个真实日期位', rsOpts.length === 4);
t('选项带真实日期提示（MM-DD）', /\d{2}-\d{2}/.test(d.querySelector('#rs-list .item .h')?.textContent || ''));
const tasksBefore = S().tasks.length;
rsOpts[1]?.click(); await sleep(80);   // 明天
const scheduled = S().tasks.find(x => x.id === item.id);
t('收集箱 -1', S().inbox.length === inboxBefore + 1);
t('tasks +1（单一事实来源）', S().tasks.length === tasksBefore + 1);
t('新任务带真实日期（明天）', scheduled && scheduled.date === tomorrowKey());
t('toast 反馈已安排', (d.getElementById('toast')?.textContent || '').includes('已安排到'));

console.log('— 已排视图由 date 派生 —');
w.goTab('plan'); await sleep(50);
d.querySelector('#plan-seg [data-seg="scheduled"]')?.click(); await sleep(60);
t('已排分段显示新安排的任务', d.querySelector('#plan-list')?.textContent.includes(item.title));
t('已排项提示为日期', /\d{2}-\d{2}/.test(d.querySelector('#plan-list .item .h')?.textContent || ''));
t('未来任务不出现在今天时间轴', !d.getElementById('today-body').textContent.includes(item.title));
const tsk = S().tasks.find(x => x.id === item.id);
d.querySelector(`#plan-list [data-plan-item="${item.id}"]`)?.click(); await sleep(80);
t('点已排项打开任务编辑（数据真实可操作）', d.querySelector('#sheet-task')?.classList.contains('on'));
w.closeSheets(); await sleep(40);

console.log('— 旧数据迁移（week/upcoming/secondary → 新模型，不丢失） —');
{
  const saved = {
    secondary: [{ id: 's9', title: '旧次要事项', done: false }],
    week: [{ id: 'w9', title: '旧本周事项', hint: '周四 · 22:00' }],
    upcoming: [{ id: 'u9', title: '旧未来事项', hint: '下周二' }],
    unscheduled: [],
  };
  const ib = S().inbox.length, tb = S().tasks.length;
  w.__epoch.migrateLegacy(saved);
  t('旧 secondary → tasks（tier=anytime）', S().tasks.some(x => x.id === 's9' && x.tier === 'anytime'));
  t('旧 week → 收集箱', S().inbox.some(x => x.id === 'w9'));
  t('旧 upcoming → 收集箱', S().inbox.some(x => x.id === 'u9'));
  t('迁移不产生重复（幂等）', (() => { w.__epoch.migrateLegacy(saved); return S().inbox.length === ib + 2 && S().tasks.length === tb + 1; })());
}

console.log('— 主题选择持久化（承诺修复） —');
d.querySelector('#theme-seg [data-mode="dark"]')?.click(); await sleep(60);
t('点击深色后 state.theme = dark', S().theme === 'dark');
t('phone 立即切换 dark', d.querySelector('.phone')?.dataset.mode === 'dark');
t('主题写入 localStorage', JSON.parse(w.localStorage.getItem('epoch-state') || '{}').theme === 'dark');
d.querySelector('#theme-seg [data-mode="light"]')?.click(); await sleep(40);

console.log('— Weekly Review 真保存（说谎按钮修复） —');
{
  const saveBtn = d.getElementById('wr-save');
  t('保存按钮存在', !!saveBtn);
  t('保存按钮不再绑定 data-back（只关不存的谎言已拆除）', saveBtn && !saveBtn.hasAttribute('data-back'));
  d.querySelector('[data-push="weekly"]')?.click(); await sleep(60);
  t('weekly 面板可打开', d.querySelector('[data-panel="weekly"]')?.classList.contains('on'));
  d.getElementById('wr-good').value = '跑完了三次步';
  d.getElementById('review-one').value = '把睡前刷手机改成阅读';
  const ib = S().inbox.length;
  saveBtn.click(); await sleep(80);
  t('state.review 已写入', !!S().review && S().review.good === '跑完了三次步');
  t('review.week = 本周一', S().review.week === w.weekKey());
  t('「下周一件事」进收集箱（回顾→下周计划闭环）', S().inbox.length === ib + 1 && S().inbox[0].title === '把睡前刷手机改成阅读' && S().inbox[0].hint === '来自本周反思');
  t('toast 反馈已保存', (d.getElementById('toast')?.textContent || '').includes('已保存'));
  t('保存后面板自动关闭', !d.querySelector('[data-panel="weekly"]')?.classList.contains('on'));
  t('Me 周回顾行显示已写', d.getElementById('me-weekly-sub')?.textContent === '已写');
  t('review 持久化到 localStorage', (() => { const s = JSON.parse(w.localStorage.getItem('epoch-state') || '{}'); return !!(s.review && s.review.one === '把睡前刷手机改成阅读'); })());
}

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
