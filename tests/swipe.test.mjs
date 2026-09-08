/* 横向滑动治理 — 禁止页面左右拖动，保留行内左滑删除（修复"首页/规划乱跑"）
 * 根因：.tl-del 待命中停在行右缘外 64px（屏幕 padding 内 40px），
 *   .screen 只设了 overflow-y:auto → overflow-x 计算为 auto → 整屏可横向拖 40px；
 *   .tl-row 的 touch-action: manipulation 允许浏览器接管横向手势 → 平移与行滑动随机二选一。
 * 运行：node tests/swipe.test.mjs
 */
import { JSDOM, VirtualConsole } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log('  ✔ ' + name); } else { fail++; console.log('  ✘ ' + name); } };

console.log('— 屏幕容器：只纵滚，横向一律裁剪 —');
const screenRule = html.match(/\.screen,\s*\.panel \{[^}]*\}/);
t('.screen/.panel 规则存在', !!screenRule);
t('overflow-x: hidden（禁止整屏左右拖动）', !!screenRule && /overflow-x:\s*hidden/.test(screenRule[0]));
t('overflow-y: auto 保留（纵向滚动不受影响）', !!screenRule && /overflow-y:\s*auto/.test(screenRule[0]));

console.log('— 行手势：横向归 JS，纵向归浏览器 —');
const manipIdx = html.indexOf('touch-action: manipulation');
const panyIdx = html.search(/\.tl-row,\s*\.item \{\s*touch-action:\s*pan-y;/);
t('基础 manipulation 规则存在', manipIdx > -1);
t('.tl-row/.item 的 pan-y 覆盖规则存在', panyIdx > -1);
t('pan-y 规则在 manipulation 之后（级联可覆盖）', manipIdx > -1 && panyIdx > manipIdx);
t('.sug-viewport 保持 pan-y（建议卡横滑不受影响）', /\.sug-viewport \{[^}]*touch-action:\s*pan-y/.test(html));

console.log('— 删除钮：待命时移出 tab 序（防聚焦滚动 40px） —');
const delRule = html.match(/\.tl-del \{[^}]*\}/);
t('.tl-del 基础规则 visibility: hidden', !!delRule && /visibility:\s*hidden/.test(delRule[0]));
const revealRules = html.match(/\.(?:tl-row|item)\.reveal \.tl-del \{[^}]*\}/g) || [];
t('两条 reveal 规则都存在（.tl-row + .item）', revealRules.length === 2);
t('reveal 时 visibility: visible（左滑仍可删除）', revealRules.length === 2 && revealRules.every(r => /visibility:\s*visible/.test(r)));

console.log('— 兜底：手机壳裁剪不破 —');
t('.phone 仍有 overflow: hidden', /\.phone \{[^}]*overflow:\s*hidden/.test(html));

/* ═══ 行为级：手势被浏览器抢走（pointercancel）时的收留策略 ═══
 * 真机（尤其 iOS）上手指滑动带纵向分量 → 浏览器接管滚动 → pointercancel，
 * 行在半途弹回、来不及点删除（2026-09-08 用户报告）。
 * 修复：非被动 touchmove 锁定后 preventDefault + cancel 时 -40 收留阈值。 */
const vc2 = new VirtualConsole();
vc2.on('jsdomError', () => {});
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true, virtualConsole: vc2 });
const w = dom.window, d = dom.window.document;
w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {} }));
if (!w.PointerEvent) w.PointerEvent = class extends w.MouseEvent {};
await new Promise(r => setTimeout(r, 1100));

const pev = (type, x, y) => new w.PointerEvent(type, { clientX: x, clientY: y, bubbles: true });
async function swipe(row, dx, { drift = 0, cancel = false } = {}) {
  const r = row.getBoundingClientRect();
  const y0 = r.top + r.height / 2, x0 = r.left + 40;
  row.dispatchEvent(pev('pointerdown', x0, y0));
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    row.dispatchEvent(pev('pointermove', x0 + (dx * i) / steps, y0 + (drift * i) / steps));
    await new Promise(rr => setTimeout(rr, 4));
  }
  row.dispatchEvent(pev(cancel ? 'pointercancel' : 'pointerup', x0 + dx, y0 + drift));
  await new Promise(rr => setTimeout(rr, 30));
}
const firstRow = () => d.querySelector('.tl-row[data-task]');

console.log('— 行为：正常滑动与释放 —');
{
  const row = firstRow();
  t('离线 boot 后时间轴有行', !!row);
  await swipe(row, -70);
  t('滑到 -70 松手 → 保持露出（可点删除）', row.classList.contains('reveal') && row.style.transform === 'translateX(-64px)');
  row.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  t('点行身收回（既有交互不破）', !row.classList.contains('reveal'));
  await swipe(row, -25);
  t('只滑 -25 松手 → 弹回', !row.classList.contains('reveal'));
}

console.log('— 行为：手势被抢（pointercancel）收留策略 —');
{
  const row = firstRow();
  await swipe(row, -50, { drift: 8, cancel: true });
  t('被抢时已滑 -50 → 保持露出（修复点：不再弹回）', row.classList.contains('reveal'));
  row.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await swipe(row, -25, { drift: 10, cancel: true });
  t('被抢时只滑 -25 → 弹回', !row.classList.contains('reveal'));
}

console.log('— 非被动 touchmove 已注册（声明手势归属） —');
t('touchmove + preventDefault + passive:false 存在于 bindRowSwipe', /addEventListener\('touchmove', \(e\) => \{\s*if \(mode === 'x' && e\.cancelable\) e\.preventDefault\(\);\s*\}, \{ passive: false \}\)/.test(html));

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
