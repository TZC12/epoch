/* 上下文建议卡 + 分段滑动切换 测试 — jsdom
 * 运行：node tests/suggestions.test.mjs
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

console.log('— buildSuggestions 纯逻辑（状态驱动） —');
t('buildSuggestions 已暴露', typeof w.buildSuggestions === 'function');

// 默认状态：inbox 4 条 > 3 → 应有 Inbox 积压卡
let cards = w.buildSuggestions();
t('默认状态：Inbox 积压卡出现', cards.some(c => c.id === 'inbox-full'));
t('每张卡都有 id/q/acts 结构', cards.every(c => c.id && c.q && Array.isArray(c.acts)));

// 超时未开始：把一个 main 任务时间改成过去且未完成
const run = w.__epoch.state.tasks.find(x => x.tier === 'main');
const origTime = run.time;
run.time = '00:01'; run.done = false;
cards = w.buildSuggestions();
t('main 任务过时未完成 → 出现提醒卡', cards.some(c => c.id === 'overdue'));
run.time = origTime;

// 负载过高：>4 项未完成
const doneBackup = w.__epoch.state.tasks.map(x => x.done);
w.__epoch.state.tasks.forEach(x => { if (x.title !== '睡觉') x.done = false; });
cards = w.buildSuggestions();
t('剩余 >4 → 负载卡出现', cards.some(c => c.id === 'heavy'));
w.__epoch.state.tasks.forEach((x, i) => x.done = doneBackup[i]);

// 安静状态：全部完成 + inbox 清空 → 0 张卡（留白）
w.__epoch.state.inbox = [];
w.__epoch.state.tasks.forEach(x => x.done = true);
w.__epoch.state.secondary.forEach(x => x.done = true);
cards = w.buildSuggestions();
t('全部完成 + Inbox 空 → 零卡片（安静）', cards.length === 0);

// 恢复
location_test: ;
w.__epoch.state.inbox = [
  { id: 'i1', title: 'Research Gentherm', hint: '建议', hintEm: '周四 22:00' },
  { id: 'i2', title: 'Learn English', hint: '未安排' },
  { id: 'i3', title: 'Make A5L campaign', hint: '未安排' },
  { id: 'i4', title: 'Sort export documents', hint: '未安排' },
];

console.log('— 渲染与交互 —');
w.__epoch.state.tasks.find(x => x.title.startsWith('Run')).done = false;
w.goTab('today'); w.renderToday(); await sleep(80);
const deck = d.querySelector('#sug-deck');
t('有卡时 deck 渲染在 Today', !!deck);
const cardCount = d.querySelectorAll('#sug-deck .sug-card').length;
t('卡片数量与 buildSuggestions 一致', cardCount === w.buildSuggestions().length);
t('多卡时显示圆点指示器', cardCount > 1 ? d.querySelectorAll('#sug-deck .sug-dot').length === cardCount : true);

// 行动按钮：Inbox 卡 "去安排" → 跳转 Plan
const planBtn = [...d.querySelectorAll('#sug-deck [data-act]')].find(b => b.dataset.act === 'plan');
t('Inbox 卡带"去安排"行动', !!planBtn);
planBtn?.click(); await sleep(80);
t('点击后跳转 Plan 页', d.querySelector('[data-screen=plan]')?.classList.contains('on'));
t('采纳后该卡从 deck 消失', w.buildSuggestions().length < cardCount || !d.querySelector('#sug-deck'));

console.log('— 分段控件：长按滑动 + 轻点 —');
t('enableSegSlide 已暴露', typeof w.enableSegSlide === 'function');
t('segIndexFromX 已暴露', typeof w.segIndexFromX === 'function');
const seg = d.querySelector('#plan-seg');
const r = { left: 0, width: 500, top: 0, height: 40 };
t('segIndexFromX：0% → 第 0 段', w.segIndexFromX(r.left + 1, { left: r.left, width: r.width, children: seg.children }) === 0);
t('segIndexFromX：99% → 最后一段', w.segIndexFromX(r.left + r.width - 1, { left: r.left, width: r.width, children: seg.children }) === seg.children.length - 1);
t('segIndexFromX：50% → 中间段', w.segIndexFromX(r.left + 250, { left: r.left, width: r.width, children: seg.children }) === 2);

// 轻点仍可切换
w.goTab('plan'); await sleep(50);
const btn2 = seg.children[1];
btn2.click(); await sleep(50);
t('轻点第 2 段仍正常切换', btn2.classList.contains('on'));

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
