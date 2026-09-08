/* 噪音清理 + 跨功能联动 冒烟测试 — jsdom
 * 运行：node tests/noise.test.mjs
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

console.log('— 假状态栏与演示组件已移除 —');
t('无假状态栏（时钟）', !d.querySelector('.statusbar'));
t('无屏幕目录按钮', !d.querySelector('#btn-gallery'));
t('无屏幕目录 overlay', !d.querySelector('#overlay-gallery'));
t('无通知预览弹层', !d.querySelector('#sheet-notif'));
t('无假"英语没完成"卡', !d.querySelector('#adapt-card') && !d.body.innerHTML.includes('英语没有完成'));
t('无假圆点周条', !d.querySelector('#plan-week'));
t('无 This Week/Month 假切换', !d.querySelector('#prog-seg'));
t('Me 页无"查看首次引导"入口', !d.body.innerHTML.includes('查看首次引导'));
t('无右下角 FAB', !d.querySelector('#fab'));
t('无 Quick Add 弹层', !d.querySelector('#sheet-qa'));

console.log('— Progress 真实化 —');
w.renderProgress(); await sleep(50);
const pb = d.querySelector('#prog-body')?.innerHTML || '';
t('70 天点阵为主体（真实执行痕迹）', d.querySelectorAll('#prog-body .grid-dots i').length === 70);
t('不含与 Today 重复的今日%大数字', !d.querySelector('#prog-body .big'));
t('包含 Goals 真实进度', !!d.querySelector('#prog-goals'));
t('包含反思输入（真实写回 Inbox）', !!d.querySelector('#ref-one') && !!d.querySelector('#ref-save'));
t('不含假 78%', !pb.includes('78'));
t('不含假 7-day rhythm', !pb.includes('7-day rhythm'));

console.log('— 联动 1：Progress 反思 → Plan Inbox —');
d.querySelector('#ref-one').value = '每周只安排三次高强度运动';
d.querySelector('#ref-save').click(); await sleep(80);
w.goTab('plan'); await sleep(50);
t('反思出现在 Plan 的 Inbox 列表', d.querySelector('#plan-list')?.textContent.includes('每周只安排三次高强度运动'));

console.log('— 联动 2：时间轴右上角 + → 新建事件 —');
const cnt0 = w.__epoch.state.tasks.length;
d.querySelector('#tl-add')?.click(); await sleep(80);
t('+ 打开新建弹框', d.querySelector('#sheet-task')?.classList.contains('on'));
d.querySelector('#td-title-in').value = '给车做保养';
d.querySelector('#td-save').click(); await sleep(80);
t('保存后任务数 +1', w.__epoch.state.tasks.length === cnt0 + 1);
t('新任务出现在时间轴', d.querySelector('#today-body').textContent.includes('给车做保养'));

console.log('— 联动 3：Progress Goals 行 → Goal 详情 —');
w.goTab('progress'); w.renderProgress(); await sleep(50);
const gRow = d.querySelector('#prog-goals [data-goal-jump]');
t('Progress 显示可点击的 Goal 行', !!gRow);
gRow?.click(); await sleep(80);
t('跳转到 Goal 详情面板', d.querySelector('[data-panel="goal"]')?.classList.contains('on'));
t('面板标题对应目标', (d.querySelector('#gd-title')?.textContent || '').length > 0);

console.log('— 核心功能未破坏 —');
t('Today 时间轴仍渲染', d.querySelectorAll('#today-body .tl-row').length > 0);
const row2 = [...d.querySelectorAll('#today-body .tl-row:not(.done)')][0];
const id2 = row2?.dataset.task;
row2?.querySelector('.tl-check').click(); await sleep(60);
const allT = w.__epoch.state.tasks;   // M1：secondary 已并入 tasks
t('仍可勾选任务', !!id2 && allT.find(x => x.id === id2)?.done === true);

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
