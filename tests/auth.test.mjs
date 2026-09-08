/* 认证流程冒烟测试 — jsdom
 * 运行：node tests/auth.test.mjs
 * 覆盖：登录页图标与品牌、三视图切换（登录/注册/忘记密码）、
 *       用户名/邮箱双登录路径、注册携带用户名、社交登录内嵌图标、眼睛切换
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

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log('  ✔ ' + name); } else { fail++; console.log('  ✘ ' + name); } };

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const visible = (sel) => { const el = d.querySelector(sel); return !!el && !el.hidden && el.offsetParent !== undefined; };
const viewOn = (name) => { const v = d.querySelector(`[data-auth-view="${name}"]`); return !!v && !v.hidden; };

await sleep(1000); // 等 boot

console.log('— 登录页静态结构 —');
t('登录屏可显示', typeof w._showAuthScreen === 'function');
w._showAuthScreen();
await sleep(100);
t('应用图标（内嵌 SVG）存在', !!d.querySelector('.auth-icon svg'));
t('品牌名只有 Epoch（无 · 时）', d.querySelector('.auth-brand')?.textContent.trim() === 'Epoch');
t('账号输入框存在（用户名或邮箱）', !!d.querySelector('#auth-account'));
t('密码输入框存在', !!d.querySelector('#auth-pwd'));
t('登录按钮存在', d.querySelector('#auth-signin')?.textContent.trim() === '登录');
t('<title> 为 Epoch', d.title === 'Epoch');
t('无 · 时 残留于标题', !d.title.includes('时'));

console.log('— 社交登录按钮已移除 —');
t('无社交登录按钮（.auth-soc 不存在）', d.querySelectorAll('.auth-soc').length === 0);
t('无 or continue with 分隔线', !d.querySelector('.auth-div'));
t('Apple 按钮不存在', !d.querySelector('#auth-apple'));
t('Google 按钮不存在', !d.querySelector('#auth-google'));

console.log('— 视图切换 —');
t('初始为登录视图', viewOn('login'));
d.querySelector('#auth-to-register')?.click(); await sleep(50);
t('切到注册视图', viewOn('register') && !viewOn('login'));
t('注册视图有用户名输入框', !!d.querySelector('#auth-reg-username'));
t('注册视图有邮箱输入框', !!d.querySelector('#auth-reg-email'));
t('注册视图有密码输入框', !!d.querySelector('#auth-reg-pwd'));
d.querySelector('#auth-to-login')?.click(); await sleep(50);
t('返回登录视图', viewOn('login'));
d.querySelector('#auth-forgot')?.click(); await sleep(50);
t('切到忘记密码视图', viewOn('forgot'));
t('忘记密码有邮箱输入框', !!d.querySelector('#auth-fp-email'));
t('忘记密码有发送按钮', !!d.querySelector('#auth-fp-send'));
d.querySelector('#auth-back-forgot')?.click(); await sleep(50);
t('从忘记密码返回登录', viewOn('login'));

console.log('— 交互 —');
const pwd = d.querySelector('#auth-pwd');
d.querySelector('#auth-eye')?.click();
t('眼睛：显示密码', pwd.type === 'text');
d.querySelector('#auth-eye')?.click();
t('眼睛：隐藏密码', pwd.type === 'password');

console.log('— 登录逻辑（用户名 / 邮箱）—');
const calls = { signIn: [], signUp: [], profileQueries: 0 };
w.sb = {
  auth: {
    signInWithPassword: async (p) => { calls.signIn.push(p); return { data: { user: { id: 'u1' } }, error: null }; },
    signUp: async (p) => { calls.signUp.push(p); return { data: { user: { id: 'u2' }, session: {} }, error: null }; },
    signInWithOAuth: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ error: null }),
  },
  from: (table) => {
    if (table === 'profiles') calls.profileQueries++;
    return { select: () => ({ eq: () => ({ single: async () => ({ data: { email: 'resolved@test.com' }, error: null }) }) }) };
  },
};
w.load = async () => {}; w.boot = async () => {}; // 拦截登录后的重载

// 用户名登录 → 查 profiles 解析邮箱
d.querySelector('#auth-account').value = 'tzc';
d.querySelector('#auth-pwd').value = 'password123';
d.querySelector('#auth-signin').click();
await sleep(150);
t('用户名登录触发了 profiles 查询', calls.profileQueries === 1);
t('用户名登录用解析出的邮箱调用 signIn', calls.signIn[0]?.email === 'resolved@test.com');

// 邮箱登录 → 直接用输入值
calls.signIn.length = 0; calls.profileQueries = 0;
w._showAuthScreen(); await sleep(50); // 重新绑定
d.querySelector('#auth-account').value = 'direct@test.com';
d.querySelector('#auth-pwd').value = 'password123';
d.querySelector('#auth-signin').click();
await sleep(150);
t('邮箱登录不查 profiles', calls.profileQueries === 0);
t('邮箱登录直接用输入的邮箱', calls.signIn[0]?.email === 'direct@test.com');

// 注册 → signUp 携带 username metadata
w._showAuthScreen(); await sleep(50);
d.querySelector('#auth-to-register').click(); await sleep(50);
d.querySelector('#auth-reg-email').value = 'new@test.com';
d.querySelector('#auth-reg-username').value = 'tzc2';
d.querySelector('#auth-reg-pwd').value = 'password123';
d.querySelector('#auth-signup').click();
await sleep(150);
t('注册调用 signUp 并携带 username metadata', calls.signUp[0]?.options?.data?.username === 'tzc2');
t('注册用注册邮箱调用 signUp', calls.signUp[0]?.email === 'new@test.com');

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
