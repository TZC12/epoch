/* 极简点阵网络背景（Ambient net）— 验收测试
 * 简报与参数依据 docs/particle-bg-research-2026-09-08.md；引擎常量经 __NET_CFG 断言在简报区间内。
 * 运行：node tests/netbg.test.mjs
 */
import { JSDOM, VirtualConsole } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'legacy.html'), 'utf8');
// jsdom 未装 canvas 包时 getContext 会报 "Not implemented"——引擎按设计安静退出，此处吞掉该已知噪音
const vc = new VirtualConsole();
vc.on('jsdomError', () => {});
vc.sendTo(console, { omitJSDOMErrors: true });
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window;
const d = w.document;
w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {} }));
let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log('  ✔ ' + name); } else { fail++; console.log('  ✘ ' + name); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
await sleep(1100);

console.log('— DOM 结构与可达性（§13/§24） —');
const cv = d.getElementById('netbg');
t('#netbg 存在且在 .aurora 层内', !!cv && !!cv.closest('.aurora'));
t('aria-hidden="true"（对辅助技术不可见）', cv?.getAttribute('aria-hidden') === 'true');

console.log('— CSS：层级与页面分级（§13/§16） —');
const netRule = html.match(/#netbg \{[^}]*\}/);
t('position: absolute + inset 0', !!netRule && /position:\s*absolute/.test(netRule[0]) && /inset:\s*0/.test(netRule[0]));
t('pointer-events: none（永不影响点击）', !!netRule && /pointer-events:\s*none/.test(netRule[0]));
t('默认层透明度 var(--net-layer, .55)（subtle）', !!netRule && /var\(--net-layer,\s*\.55\)/.test(netRule[0]));
t('ambient 档 .78 / featured 档 1', /\.phone\[data-net="ambient"\]\s*\{\s*--net-layer:\s*\.78/.test(html) && /\.phone\[data-net="featured"\]\s*\{\s*--net-layer:\s*1/.test(html));

console.log('— 颜色 token（§12/§14/§21） —');
const rootBlock = html.match(/:root \{[\s\S]*?\n\}/);
const darkBlock = html.match(/\.phone\[data-mode="dark"\] \{[\s\S]*?\n\}/);
t('浅色 --net-dot #7C8AA5 / --net-link #A7B2C4', !!rootBlock && /--net-dot:\s*#7C8AA5/.test(rootBlock[0]) && /--net-link:\s*#A7B2C4/.test(rootBlock[0]));
t('深色低亮度灰蓝（#8A94A8 / #7C8AA5）', !!darkBlock && /--net-dot:\s*#8A94A8/.test(darkBlock[0]) && /--net-link:\s*#7C8AA5/.test(darkBlock[0]));
t('引擎内不写裸颜色（取自 token）', !/fillStyle\s*=\s*['"]#/.test(html) && /g2d\.fillStyle = colDot/.test(html));

console.log('— 引擎参数在简报区间内（§05–§10/§19） —');
const C = w.__NET_CFG;
t('__NET_CFG 已暴露（可测性）', !!C);
t('粒子数分档：桌面 50∈[35,55] / 平板 36∈[25,40] / 手机 20∈[15,25]', !!C && C.countByViewport[0][1] >= 35 && C.countByViewport[0][1] <= 55 && C.countByViewport[1][1] >= 25 && C.countByViewport[1][1] <= 40 && C.countByViewport[2][1] >= 15 && C.countByViewport[2][1] <= 25);
t('粒径 ≤2.5px（半径 ≤1.25）', !!C && C.dotR[1] <= 1.25);
t('点透明度 ⊂ [0.05, 0.35] 且克制（≤0.30）', !!C && C.dotA[0] >= 0.05 && C.dotA[1] <= 0.30);
t('连线距离 ∈ [100,160]', !!C && C.linkDist >= 100 && C.linkDist <= 160);
t('连线透明度 ∈ [0.05,0.12] / 线宽 ∈ [0.5,1]', !!C && C.linkA >= 0.05 && C.linkA <= 0.12 && C.linkW >= 0.5 && C.linkW <= 1);
t('速度 ⊂ [0.1,0.35]（慢漂移）', !!C && C.speed[0] >= 0.1 && C.speed[1] <= 0.35);
t('repulse 半径 ∈ [70,100]（§10 弱交互）', !!C && C.repulseR >= 70 && C.repulseR <= 100);
t('DPR cap ≤2（§19 省电）', !!C && C.dprCap <= 2);

console.log('— 交互禁令（§10/§11） —');
const engineSeg = html.slice(html.indexOf('const NET_CFG'), html.indexOf('DOMContentLoaded'));
t('引擎无 click 监听（点击不生成粒子）', !/addEventListener\(\s*['"]click/.test(engineSeg));
t('触摸设备不启用 repulse（pointerType 过滤存在）', /pointerType[^;]*!==\s*'mouse'/.test(engineSeg));

console.log('— 页面分级映射与运行时（§16） —');
t('today/plan/me → subtle', w.__netTierFor('today') === 'subtle' && w.__netTierFor('plan') === 'subtle' && w.__netTierFor('me') === 'subtle');
t('progress → ambient；auth/未知 → featured', w.__netTierFor('progress') === 'ambient' && w.__netTierFor('auth') === 'featured' && w.__netTierFor('xyz') === 'featured');
t('离线 boot 后默认 subtle', d.querySelector('.phone')?.dataset.net === 'subtle');
w.goTab('progress'); await sleep(60);
t('切到进展 → data-net=ambient', d.querySelector('.phone')?.dataset.net === 'ambient');
w.goTab('today'); await sleep(60);
t('切回今天 → data-net=subtle', d.querySelector('.phone')?.dataset.net === 'subtle');

console.log('— 无 2D 环境守卫（jsdom 安全） —');
t('引擎标记 ready 且安静退出（不崩 boot）', cv?.dataset.ready === '1' && w.__NET_STATE === undefined);

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
