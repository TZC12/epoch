/* 每日 0 点重置 — 跨日检测 → 时间轴/次要/习惯全部回到未完成，昨日快照定格
 * 运行：node tests/rollover.test.mjs
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
const S = () => w.__epoch.state;
const key = () => w.dateKey(new Date());
const ykey = () => { const dt = new Date(); dt.setDate(dt.getDate() - 1); return w.dateKey(dt); };

console.log('— 跨日重置 —');
t('checkDayRollover 已暴露', typeof w.checkDayRollover === 'function');

// 造"昨天"的最终使用状态：完成 2 个主任务 + 1 个随时（原次要，M1 并入 tasks）+ 1 个习惯
const tasks = S().tasks.filter(x => x.title !== '睡觉');
tasks[0].done = true; tasks[1].done = true;
S().tasks.find(x => x.tier === 'anytime').done = true;
S().habits[0].done = true;
w.renderToday(); await sleep(60);
const doneCount = S().tasks.filter(x => x.title !== '睡觉' && x.done).length;

// 把快照挪到昨天、伪造"上次活跃日 = 昨天"、昨天处于全完成态
S().history[ykey()] = S().history[key()];
delete S().history[key()];
S().lastDay = ykey();
S().todayState = 'completed';

const changed = w.checkDayRollover(); await sleep(60);
t('检测到跨日并执行重置', changed === true);
t('主任务全部回到未完成', S().tasks.every(x => !x.done));
t('随时任务全部回到未完成', S().tasks.filter(x => x.tier === 'anytime').every(x => !x.done));
t('习惯全部回到未完成', S().habits.every(x => !x.done));
t('昨日快照已定格（done 保留）', S().history[ykey()]?.done === doneCount);
t('昨日快照 total 真实', S().history[ykey()]?.total === S().tasks.filter(x => x.title !== '睡觉').length);
t('今日快照从 0 开始', S().history[key()]?.done === 0 && S().history[key()]?.total > 0);
t('lastDay 已推进到今天', S().lastDay === key());
t('全完成态已复位为默认', S().todayState === 'default');

w.renderToday(); await sleep(60);
t('时间轴无已完成行', d.querySelectorAll('#today-body .tl-row.done').length === 0);
t('仪表盘已完成归零', d.getElementById('dash-done')?.textContent === '0');
t('待完成 = 总数', d.getElementById('dash-todo')?.textContent === String(S().tasks.filter(x => x.title !== '睡觉').length));

t('同一天内重复调用不再触发', w.checkDayRollover() === false);
w.renderToday(); await sleep(40);
t('重复调用后状态保持未完成', S().tasks.every(x => !x.done));

console.log('— 未来日期任务不受影响 —');
const future = { id: 'f1', time: '10:00', title: '未来的事', done: false, tier: 'main', date: (() => { const dt = new Date(); dt.setDate(dt.getDate() + 3); return w.dateKey(dt); })() };
S().tasks.push(future);
w.checkDayRollover();
t('未来任务不被重置逻辑破坏（保留在 tasks）', S().tasks.some(x => x.id === 'f1'));
t('未来任务不出现在今天时间轴', !d.getElementById('today-body').textContent.includes('未来的事'));

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
