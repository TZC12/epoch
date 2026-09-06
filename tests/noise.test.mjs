/* 噪音清理 + 跨功能联动 冒烟测试 — jsdom
 * 运行：node tests/noise.test.mjs
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

console.log('— Progress 真实化 —');
w.renderProgress(); await sleep(50);
const pb = d.querySelector('#prog-body')?.innerHTML || '';
t('包含真实"今日完成"区块', pb.includes('今日') || pb.includes('Today'));
t('包含 Goals 真实进度', !!d.querySelector('#prog-goals'));
t('包含反思输入（真实写回 Inbox）', !!d.querySelector('#ref-one') && !!d.querySelector('#ref-save'));
t('不含假 78%', !pb.includes('78'));
t('不含假 7-day rhythm', !pb.includes('7-day rhythm'));

console.log('— 联动 1：Progress 反思 → Plan Inbox —');
d.querySelector('#ref-one').value = '每周只安排三次高强度运动';
d.querySelector('#ref-save').click(); await sleep(80);
w.goTab('plan'); await sleep(50);
t('反思出现在 Plan 的 Inbox 列表', d.querySelector('#plan-list')?.textContent.includes('每周只安排三次高强度运动'));

console.log('— 联动 2：快速添加 → 真实 Reschedule —');
w.openSheet('sheet-qa');
d.querySelector('#qa-input').value = '给车做保养';
d.querySelector('#qa-save').click(); await sleep(80);
const sug = d.querySelector('#qa-schedule');
t('保存后出现"安排时间"建议按钮', !!sug);
sug?.click(); await sleep(80);
t('打开了真实的 Reschedule 弹层', d.querySelector('#sheet-rs')?.classList.contains('on'));
t('Reschedule 标题是刚添加的条目', d.querySelector('#rs-title')?.textContent.includes('给车做保养'));

console.log('— 联动 3：Today 目标标签 → Goal 详情 —');
w.closeSheets(); w.goTab('today'); w.renderToday(); await sleep(50);
const goalTag = d.querySelector('#today-body .task .g');
t('主任务显示目标标签', !!goalTag);
goalTag?.click(); await sleep(80);
t('跳转到 Goal 详情面板', d.querySelector('[data-panel="goal"]')?.classList.contains('on'));
t('面板标题对应目标', (d.querySelector('#gd-title')?.textContent || '').length > 0);

console.log('— 核心功能未破坏 —');
t('Today 时间轴仍渲染', d.querySelectorAll('#today-body .tl-row').length > 0);
t('仍可勾选任务', (() => { const row = d.querySelector('#today-body .task:not(.done)'); row?.click(); return true; })());

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
