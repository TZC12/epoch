/* 横向滑动治理 — 禁止页面左右拖动，保留行内左滑删除（修复"首页/规划乱跑"）
 * 根因：.tl-del 待命中停在行右缘外 64px（屏幕 padding 内 40px），
 *   .screen 只设了 overflow-y:auto → overflow-x 计算为 auto → 整屏可横向拖 40px；
 *   .tl-row 的 touch-action: manipulation 允许浏览器接管横向手势 → 平移与行滑动随机二选一。
 * 运行：node tests/swipe.test.mjs
 */
import { JSDOM } from 'jsdom';
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

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
