/* Today 重构测试 — 仪表盘/时间轴合一/编辑/左滑删除/历史快照
 * 运行：node tests/today.test.mjs
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true });
const w = dom.window;
const d = w.document;
w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
/* jsdom 无 PointerEvent：用 MouseEvent 派生（bindRowSwipe 只读 clientX/clientY） */
if (!w.PointerEvent) {
  w.PointerEvent = class extends w.MouseEvent {};
}
globalThis.PointerEvent = w.PointerEvent;
let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log('  ✔ ' + name); } else { fail++; console.log('  ✘ ' + name); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
await sleep(1100);
const S = () => w.__epoch.state;

console.log('— 头部：日期突出 / 无问候 —');
t('无问候语（晚上好/Good morning 不在 DOM）', !d.body.innerHTML.includes('晚上好') && !d.getElementById('greet'));
const dl = d.getElementById('date-line')?.textContent || '';
t('日期含年份与星期（如 2026年…星期日）', /2026年/.test(dl) && /星期/.test(dl));
t('头部右侧有加号（新建事件）', !!d.getElementById('tl-add'));

console.log('— 仪表盘进度（真实计算） —');
const act = S().tasks.filter(x => x.title !== '睡觉');
const doneN = act.filter(x => x.done).length + S().secondary.filter(x => x.done).length;
const totalN = act.length + S().secondary.length;
t('百分比真实', d.getElementById('dash-pct')?.textContent === Math.round(doneN / totalN * 100) + '%');
t('分数真实（x/y 项）', d.getElementById('dash-frac')?.textContent.replace(/\s/g, '') === `${doneN}/${totalN}项`);
t('已完成数字真实', d.getElementById('dash-done')?.textContent === String(doneN));
t('待完成数字真实', d.getElementById('dash-todo')?.textContent === String(totalN - doneN));
t('横向进度条已删除', !d.querySelector('.dash-bar') && !d.getElementById('dash-bar'));
t('时间范围/剩余时间文字已删除', !d.querySelector('.dash-range') && !d.getElementById('dash-span') && !d.getElementById('dash-left'));

console.log('— 文案与分区清理 —');
const bodyTxt = d.getElementById('today-body').textContent;
t('无"结构线索"解释文字', !bodyTxt.includes('结构线索'));
t('无"今日重点"分区', !bodyTxt.includes('今日重点'));
t('无"最多三项"', !d.body.innerHTML.includes('最多三项'));
t('无"次要"分区', !bodyTxt.includes('次要'));

console.log('— 进行中状态与紧急紫色 —');
t('无"正在"小字标签', !bodyTxt.includes('正在运行') && !d.querySelector('#today-body .tag-now'));
t('无"下一个"小字标签', !d.querySelector('#today-body .tag-next'));
const someTask = S().tasks.find(x => x.tier === 'main');
someTask.urgent = true; w.renderToday(); await sleep(50);
t('紧急任务标题为紫色（urgent class）', !!d.querySelector('#today-body .tl-title.urgent'));
someTask.urgent = false; w.renderToday(); await sleep(30);

console.log('— 左滑删除 —');
const rowsBefore = d.querySelectorAll('#today-body .tl-row').length;
const row = [...d.querySelectorAll('#today-body .tl-row')].find(r => r.dataset.task);
const r = row.getBoundingClientRect();
const pe = (el, type, x) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 9, clientX: x, clientY: r.top + 10 }));
pe(row, 'pointerdown', r.left + 150);
for (let i = 1; i <= 5; i++) { pe(row, 'pointermove', r.left + 150 - i * 20); await sleep(12); }
pe(row, 'pointerup', r.left + 30);
await sleep(50);
t('左滑后露出删除按钮（reveal）', row.classList.contains('reveal'));
const delBtn = row.querySelector('.tl-del');
t('删除按钮可见', !!delBtn);
delBtn?.click(); await sleep(80);
t('点击删除后行数减少', d.querySelectorAll('#today-body .tl-row').length === rowsBefore - 1);

console.log('— 编辑弹框 —');
const t2 = S().tasks.find(x => x.tier === 'main');
w.openTaskDetail(t2); await sleep(80);
t('弹框打开且标题可编辑', !!d.getElementById('td-title-in'));
d.getElementById('td-title-in').value = 'Swim · 40 min';
d.getElementById('td-time-in').value = '18:00';
d.getElementById('td-urgent').click(); await sleep(30);
t('紧急开关可切换（紫色激活）', d.getElementById('td-urgent').classList.contains('on'));
d.getElementById('td-save').click(); await sleep(80);
t('保存后标题生效', t2.title === 'Swim · 40 min');
t('保存后时间生效', t2.time === '18:00');
t('保存后紧急生效', t2.urgent === true);
t('时间轴出现紫色标题', !!d.querySelector('#today-body .tl-title.urgent'));

console.log('— 快速新建 —');
const cnt0 = S().tasks.length;
d.getElementById('tl-add')?.click(); await sleep(80);
t('点 + 打开新建弹框', d.querySelector('#sheet-task')?.classList.contains('on'));
d.getElementById('td-title-in').value = 'Read a book';
d.getElementById('td-time-in').value = '21:30';
d.getElementById('td-save').click(); await sleep(80);
t('新建后任务数 +1', S().tasks.length === cnt0 + 1);
t('新任务在时间轴中', d.getElementById('today-body').textContent.includes('Read a book'));

console.log('— FAB 已移除 —');
t('无右下角加号', !d.getElementById('fab'));
t('无 Quick Add 弹层', !d.getElementById('sheet-qa'));

console.log('— 历史快照与 Calendar 四色 —');
const key = w.dateKey(new Date());
t('dateKey 已暴露', typeof w.dateKey === 'function');
w.renderToday(); await sleep(80);  // 触发 save→snap
const h = S().history?.[key];
t('今日快照已记录', !!h && typeof h.done === 'number' && typeof h.total === 'number');
t('紧急计划快照为真', h?.urgent === true);
t('calendarDotClass 已暴露', typeof w.calendarDotClass === 'function');
t('全完成 → full（绿）', w.calendarDotClass({ done: 5, total: 5 }) === 'full');
t('部分完成 → part（橙）', w.calendarDotClass({ done: 2, total: 5 }) === 'part');
t('缺席 → miss（红）', w.calendarDotClass({ done: 0, total: 3 }) === 'miss');
t('紧急计划 → urgent（紫）', w.calendarDotClass({ done: 5, total: 5, urgent: true }) === 'urgent');
t('无数据 → 空', w.calendarDotClass(undefined) === '');
t('habit-dots 渲染 70 格', d.querySelectorAll('#habit-dots i').length === 70);

console.log('— 删除可撤销（undo-support） —');
{
  const target = S().tasks.find(x => x.title !== '睡觉');
  const before = S().tasks.length;
  const row = d.querySelector(`.tl-row[data-task="${target.id}"]`);
  row?.querySelector('.tl-del')?.click(); await sleep(80);
  t('左滑删除后任务移除', S().tasks.length === before - 1);
  const toastEl = d.getElementById('toast');
  t('toast 有 role=status + aria-live', toastEl?.getAttribute('role') === 'status' && toastEl?.getAttribute('aria-live') === 'polite');
  const undoBtn = toastEl?.querySelector('.toast-act');
  t('toast 出现撤销按钮', !!undoBtn);
  undoBtn?.click(); await sleep(80);
  t('点撤销后任务恢复', S().tasks.some(x => x.id === target.id) && S().tasks.length === before);
}
{
  const target2 = S().tasks.find(x => x.title !== '睡觉');
  w.openTaskDetail(target2); await sleep(60);
  d.getElementById('td-delete').click(); await sleep(60);
  t('编辑弹框删除也移除任务', !S().tasks.some(x => x.id === target2.id));
  t('删除后弹框关闭', !d.querySelector('#sheet-task')?.classList.contains('on'));
  d.querySelector('#toast .toast-act')?.click(); await sleep(60);
  t('编辑删除同样可撤销', S().tasks.some(x => x.id === target2.id));
}

console.log('— 可达性基础（触控目标 / 焦点环 / 点按延迟） —');
t('Tab 按钮 min-height 44px', /min-height:\s*44px/.test(html));
t('tl-add 有扩展热区（::after）', /\.tl-add::after[^}]*inset:\s*-8px/.test(html));
t('键盘焦点环规则存在', /:focus-visible[^{]*\{[^}]*outline/.test(html));
t('touch-action: manipulation 已启用', /touch-action:\s*manipulation/.test(html));
t('auth 错误区 role=alert', d.getElementById('auth-err')?.getAttribute('role') === 'alert');

console.log('— 收集箱左滑删除可撤销 —');
{
  const item = S().inbox[0];
  const before = S().inbox.length;
  const el = d.querySelector(`#plan-list [data-plan-item="${item.id}"]`);
  t('收集箱项已渲染（含删除按钮）', !!el && !!el.querySelector('.tl-del'));
  el?.querySelector('.tl-del')?.click(); await sleep(80);
  t('删除后收集箱 -1', S().inbox.length === before - 1);
  d.querySelector('#toast .toast-act')?.click(); await sleep(80);
  t('撤销后收集箱恢复', S().inbox.length === before && S().inbox.some(x => x.id === item.id));
}

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
