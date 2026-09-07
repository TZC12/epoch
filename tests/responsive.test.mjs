/* 响应式自适应 — 桌面贴合窗口高度 + 大屏加宽（规格：用户选定方案 B）
 * 运行：node tests/responsive.test.mjs
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log('  ✔ ' + name); } else { fail++; console.log('  ✘ ' + name); } };

console.log('— 桌面（≥520px）：高度贴合窗口 —');
const m520 = html.match(/@media \(min-width: 520px\) \{[\s\S]*?\n\}/);
t('≥520 媒体块存在', !!m520);
t('手机壳高度 = 100dvh - 64px（贴合窗口）', !!m520 && /height:\s*calc\(100dvh\s*-\s*64px\)/.test(m520[0]));
t('不再固定 880px 高', !!m520 && !/max-height:\s*880px/.test(m520[0]));
t('极矮窗口保底 640px', !!m520 && /min-height:\s*640px/.test(m520[0]));

console.log('— 大屏（≥1024px）：加宽到 480px —');
const m1024 = html.match(/@media \(min-width: 1024px\) \{[\s\S]*?\n\}/);
t('≥1024 媒体块存在', !!m1024);
t('手机壳加宽到 480px', !!m1024 && /max-width:\s*480px/.test(m1024[0]));

console.log('— 手机真机（<520px）：维持全屏 —');
t('.phone 基础规则仍为 100dvh / 全宽', /\.phone \{[^}]*min-height:\s*100dvh/.test(html) && /\.phone \{[^}]*width:\s*100%/.test(html));

console.log('— 内部滚动就绪（高度变化后内容自滚） —');
t('.screen 自身可滚动', /\.screen,\s*\.panel \{[^}]*overflow-y:\s*auto/.test(html));

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
