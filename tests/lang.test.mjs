/* 中英文切换 — 系统文字统一切换，用户内容保持原样
 * 运行：node tests/lang.test.mjs
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

console.log('— 默认中文 —');
t('setLang 已暴露', typeof w.setLang === 'function');
t('默认语言 zh', S().lang === 'zh');
t('仪表盘标签为中文', d.querySelector('.ds-label')?.textContent === '今日进度');
t('底部 Tab 为中文', d.querySelector('.tab[data-tab="plan"] span')?.textContent === '规划');

console.log('— 切换英文：系统文字统一 —');
w.setLang('en'); await sleep(120);
t('state.lang = en', S().lang === 'en');
t('仪表盘标签变英文', d.querySelector('.ds-label')?.textContent === 'Progress today');
t('已完成/待完成变英文', d.querySelector('.ds-n span')?.textContent === 'Done' || d.querySelectorAll('.ds-n span')[0]?.textContent === 'Done');
t('Tab 变英文', d.querySelector('.tab[data-tab="plan"] span')?.textContent === 'Plan');
t('日期行变英文格式', /September|Sep/.test(d.getElementById('date-line')?.textContent || ''));
t('语言持久化到本地', JSON.parse(w.localStorage.getItem('epoch-state') || '{}').lang === 'en');

console.log('— 全 DOM 中文残留扫描（系统文字必须全英文） —');
{
  const CJK = /[\u4e00-\u9fff]/;
  const walker = d.createTreeWalker(d.body, w.NodeFilter.SHOW_TEXT);
  const leaks = new Set();
  let n;
  while ((n = walker.nextNode())) {
    const p = n.parentElement;
    if (!p || /^(SCRIPT|STYLE)$/.test(p.tagName)) continue;
    if (p.closest('[data-user]') || p.closest('[data-lang-seg]')) continue; // 用户内容 / 语言名本身除外
    const v = n.nodeValue.trim();
    if (v && CJK.test(v)) leaks.add(v.slice(0, 40));
  }
  t('无系统中文残留（实际 ' + leaks.size + ' 处）', leaks.size === 0);
  if (leaks.size) console.log('   残留：', [...leaks].join(' | '));
}

console.log('— 编辑弹框（动态生成） —');
w.openTaskDetail(S().tasks.find(x => x.title !== '睡觉')); await sleep(80);
t('类型 chip 变英文', [...d.querySelectorAll('#td-types .chip')].some(c => c.textContent === 'Work'));
t('紧急 chip 变英文', d.getElementById('td-urgent')?.textContent === 'Urgent');
t('表单标签变英文', [...d.querySelectorAll('.td-f label')].some(l => l.textContent === 'Start time'));
t('保存按钮变英文', d.getElementById('td-save')?.textContent === 'Save');
w.closeSheets();

console.log('— 用户内容不翻译 —');
S().tasks.push({ id: 'u1', time: '09:00', title: '买咖啡', done: false, tier: 'main' });
const enTask = { id: 'u2', title: 'Save', done: false, tier: 'main' };
S().tasks.push(enTask);
w.renderToday(); await sleep(120);
const bodyTxt = d.getElementById('today-body').textContent;
t('中文标题保持原样（买咖啡）', bodyTxt.includes('买咖啡'));
t('与系统词撞名的用户任务保持原样（Save）', bodyTxt.includes('Save'));

console.log('— 切回中文：恢复 —');
w.setLang('zh'); await sleep(120);
t('仪表盘标签恢复中文', d.querySelector('.ds-label')?.textContent === '今日进度');
t('Tab 恢复中文', d.querySelector('.tab[data-tab="plan"] span')?.textContent === '规划');
t('用户内容仍是英文原样（Save）', d.getElementById('today-body').textContent.includes('Save'));
t('日期行恢复中文格式', /月/.test(d.getElementById('date-line')?.textContent || ''));

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
