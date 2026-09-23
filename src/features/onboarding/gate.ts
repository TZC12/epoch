export const OB_KEY = 'epoch-ob-done'

/**
 * 首访要不要上引导——单独成模块：AppShell 每次启动都要问这一句，
 * 而 Onboarding 组件本身用 Field（→ motion，46 kB gz）。
 * 两者同文件时，AppShell 的静态图会把整个 motion 拖进入口 chunk
 * （实测入口 90.45 → 100.70 kB gz）。所以这里只放这个纯判断，组件走 lazy()。
 */
export function needOnboarding(): boolean {
  try { return localStorage.getItem(OB_KEY) !== '1' } catch { return false }
}
