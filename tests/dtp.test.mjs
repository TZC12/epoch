/* 日期/时间选择器测试 — 应用内玻璃风格弹窗替代原生 input 弹窗
 * 运行：node tests/dtp.test.mjs
 * 覆盖：原生输入移除 / 隐藏值存储 / 日历渲染与点选 / 滚轮点选写值 / 清除·完成 / 保存链路
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
if (!w.PointerEvent) w.PointerEvent = class extends w.MouseEvent {};
globalThis.PointerEvent = w.PointerEvent;
let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log('  ✔ ' + name); } else { fail++; console.log('  ✘ ' + name); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
await sleep(1100);
const S = () => w.__epoch.state;

console.log('— 结构替换：原生弹窗已移除 —');
t('原生 input[type=time] 已移除', !d.querySelector('input[type="time"]'));
t('原生 input[type=date] 已移除', !d.querySelector('input[type="date"]'));
t('隐藏值存储保留（td-time-in / td-date-in）',
  d.getElementById('td-time-in')?.type === 'hidden' && d.getElementById('td-date-in')?.type === 'hidden');

console.log('— 新建事件：字段显示值 —');
d.getElementById('tl-add').click(); await sleep(50);
t('打开表单后显示「未定时」',
  d.getElementById('td-time-view').textContent === '未定时' && d.getElementById('td-date-view').textContent === '未定时');
t('未设置时带 unset 弱化样式',
  d.getElementById('td-time-view').classList.contains('unset') && d.getElementById('td-date-view').classList.contains('unset'));
t('选择器面板默认收起', d.getElementById('dtp').hidden === true);

console.log('— 日历模式 —');
d.getElementById('td-date-f').click(); await sleep(30);
t('点「日期」展开日历（滚轮隐藏）',
  d.getElementById('dtp').hidden === false && d.getElementById('dtp-cal').hidden === false && d.getElementById('dtp-wheels').hidden === true);
t('月标题格式（如 2026年9月）', /^\d{4}年\d+月$/.test(d.getElementById('dtp-month').textContent));
t('星期表头 7 列（日一二三四五六）',
  d.getElementById('dtp-dow').textContent.replace(/\s/g, '') === '日一二三四五六');
const dayCells = [...d.getElementById('dtp-grid').querySelectorAll('b')];
t('日格 28–31 天且含今日标记', dayCells.length >= 28 && dayCells.length <= 31 && !!d.querySelector('#dtp-grid b.today'));
const d15 = dayCells.find(b => b.dataset.d === '15');
d15.click(); await sleep(30);
t('点 15 日 → 隐藏值写入当月 15 日', /-\d{2}-15$/.test(d.getElementById('td-date-in').value));
t('字段显示含「15」且去掉 unset', d.getElementById('td-date-view').textContent.includes('15') && !d.getElementById('td-date-view').classList.contains('unset'));
t('选中日带 sel 填充态', d.querySelector('#dtp-grid b.sel')?.dataset.d === '15');
const mBefore = d.getElementById('dtp-month').textContent;
d.getElementById('dtp-next').click(); await sleep(20);
const mAfter = d.getElementById('dtp-month').textContent;
d.getElementById('dtp-prev').click(); await sleep(20);
t('月导航 ‹ › 往返（切走再切回）', mAfter !== mBefore && d.getElementById('dtp-month').textContent === mBefore);
t('清除 → 日期值空 + 显示「未定时」',
  (() => { d.getElementById('dtp-clear').click(); return d.getElementById('td-date-in').value === '' && d.getElementById('td-date-view').textContent === '未定时'; })());

console.log('— 滚轮模式 —');
d.getElementById('td-time-f').click(); await sleep(30);
t('点「开始时间」切到滚轮（日历隐藏）',
  d.getElementById('dtp-wheels').hidden === false && d.getElementById('dtp-cal').hidden === true);
t('列标题 小时/分钟 可见', d.getElementById('dtp-wcap').hidden === false);
const wh = [...d.getElementById('dtp-wh').querySelectorAll('li')];
const wm = [...d.getElementById('dtp-wm').querySelectorAll('li')];
t('滚轮 24 小时 + 12 档分钟（5 步进）', wh.length === 24 && wm.length === 12 && wm[3].dataset.v === '15');
wh.find(li => li.dataset.v === '18').click(); await sleep(20);
t('点 18 时 → 值 18:00', d.getElementById('td-time-in').value === '18:00');
wm.find(li => li.dataset.v === '30').click(); await sleep(20);
t('点 30 分 → 值 18:30 且字段显示 18:30',
  d.getElementById('td-time-in').value === '18:30' && d.getElementById('td-time-view').textContent === '18:30');
t('选中行 sel 高亮', wh.find(li => li.dataset.v === '18').classList.contains('sel'));
t('清除 → 时间值空 + 显示「未定时」',
  (() => { d.getElementById('dtp-clear').click(); return d.getElementById('td-time-in').value === '' && d.getElementById('td-time-view').textContent === '未定时'; })());

console.log('— 关闭与再开 —');
d.getElementById('dtp-done').click(); await sleep(20);
t('「完成」收起面板', d.getElementById('dtp').hidden === true);
d.getElementById('td-date-f').click(); await sleep(20);
t('同字段再点收起、再点再开',
  (() => { const f = d.getElementById('td-date-f'); f.click(); const closed = d.getElementById('dtp').hidden; f.click(); return closed === true && d.getElementById('dtp').hidden === false; })());

console.log('— 保存链路（tier 派生不受影响） —');
d.getElementById('dtp-done').click();
d.getElementById('td-title-in').value = '选择器冒烟';
wh.find(li => li.dataset.v === '20').click(); await sleep(20);
wm.find(li => li.dataset.v === '30').click(); await sleep(20);
d.getElementById('td-save').click(); await sleep(50);
const created = S().tasks.filter(x => x.title === '选择器冒烟').pop();
t('任务落库 time=20:30', !!created && created.time === '20:30');
t('有时间 → tier=main', !!created && created.tier === 'main');

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
