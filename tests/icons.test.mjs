/* Icon 系统 Stage1 测试 — sprite 化 / 单一 family / stroke·尺寸三档 / use 切换
 * 运行：node tests/icons.test.mjs
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

console.log('— sprite 结构 —');
const sprite = d.getElementById('app-sprite');
t('sprite 存在且隐藏渲染', !!sprite && sprite.getAttribute('aria-hidden') === 'true');
t('symbol 共 9 枚（clock/plan/progress/me/plus/check/chevron-left/arrow-right/eye/eye-off 去重）',
  sprite.querySelectorAll('symbol').length === 10);
t('symbol 均为 24 网格 viewBox', [...sprite.querySelectorAll('symbol')].every(s => s.getAttribute('viewBox') === '0 0 24 24'));

console.log('— 引用替换 —');
const uses = [...d.querySelectorAll('svg.use-check, svg')].filter(s => s.querySelector('use'));
t('use 引用 ≥15 处', uses.length >= 15);
t('use 均带 .ic 类', uses.every(s => s.classList.contains('ic')));
t('无 sprite 外的 24×24 内联 path 残留',
  [...d.querySelectorAll('svg path')].every(p => p.closest('#app-sprite') || p.closest('svg:not([viewBox="0 0 24 24"])')));

console.log('— stroke / 尺寸档位 —');
t('旧散装 stroke 值清零（1.6/1.7/2.1/2.2/2.6）',
  !/stroke-width:\s*(1\.6|1\.7|2\.1|2\.2|2\.6)[;\s]/.test(html));
t('stroke 三档 token 就位（1.75/2/2.25）',
  html.includes('stroke-width: 1.75') && /\.ic \{[^}]*stroke-width: 2;/.test(html) && html.includes('stroke-width: 2.25'));
t('尺寸七档 token 就位', ['--ic-12', '--ic-16', '--ic-18', '--ic-20', '--ic-24', '--ic-28', '--ic-32'].every(k => html.includes(k)));
t('icon 颜色走 currentColor（.ic 基类）', /\.ic \{[^}]*stroke: currentColor/.test(html));

console.log('— 行为：auth-eye 图标切换 —');
d.getElementById('auth-eye').click(); await sleep(30);
t('点击后切为 eye-off', d.querySelector('#auth-eye use')?.getAttribute('href') === '#i-eye-off');
d.getElementById('auth-eye').click(); await sleep(30);
t('再点切回 eye', d.querySelector('#auth-eye use')?.getAttribute('href') === '#i-eye');
t('aria-label 保持（不因迁移丢失）', d.getElementById('auth-eye')?.getAttribute('aria-label') === '显示或隐藏密码');

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
