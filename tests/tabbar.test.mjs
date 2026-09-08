/* 导航栏零动效 — 用户决策（2026-09-08）：tabbar 永不做动效/动态 SVG，
 * 点按不得有晃动。原版行为 = 仅颜色过渡；3e4c7b1 曾引入 :active 缩放 +
 * transform 过渡造成"点按晃动"，本测试防回归。
 * 运行：node tests/tabbar.test.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'legacy.html'), 'utf8');
const css = html.replace(/\/\*[\s\S]*?\*\//g, ''); // 剥掉注释再匹配，防注释措辞误报

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log('  ✔ ' + name); } else { fail++; console.log('  ✘ ' + name); } };

console.log('— .tab 过渡：只有颜色 —');
const tabRule = css.match(/^\.tab \{[^}]*\}/m);
t('.tab 规则存在', !!tabRule);
t('transition 含 color', !!tabRule && /transition:\s*color/.test(tabRule[0]));
t('transition 不含 transform（点按无回弹晃动）', !!tabRule && !/transform/.test(tabRule[0]));

console.log('— 无按压缩放 —');
t('不存在 .tab:active 缩放规则', !/\.tab:active\s*\{[^}]*transform/.test(css));

console.log('— 激活态 = 仅变色 —');
const tabOn = css.match(/^\.tab\.on \{[^}]*\}/m);
t('.tab.on 只改 color（不动 transform/字重）', !!tabOn && /color/.test(tabOn[0]) && !/transform|font-weight/.test(tabOn[0]));

console.log('— 无动画注入 —');
t('.tab/.tabbar 无 animation 声明', !/\.tab[a-z]*[^{]*\{[^}]*animation:/.test(css.replace(/\.tabbar \{[^}]*\}/, m => m.replace(/transition/g, 'x'))));
t('.tabbar 保留面板滑走过渡（原版既有行为）', /\.tabbar \{[^}]*transition:\s*transform/.test(css));

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
