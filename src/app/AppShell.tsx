import type { ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock, CalendarDays, ChartNoAxesColumn, User } from 'lucide-react'
import { NetBackground } from '@/components/NetBackground'
import './app-shell.css'

/** Tab 定义（唯一导航源；移动底栏与桌面侧栏共用）。 */
export const TABS = [
  { to: '/today', key: 'nav.today' as const, Icon: Clock, tier: 'subtle' as const },
  { to: '/plan', key: 'nav.plan' as const, Icon: CalendarDays, tier: 'subtle' as const },
  { to: '/progress', key: 'nav.progress' as const, Icon: ChartNoAxesColumn, tier: 'ambient' as const },
  { to: '/me', key: 'nav.me' as const, Icon: User, tier: 'subtle' as const },
]

export function AppShell({ children }: { children?: ReactNode }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const active = TABS.find((x) => pathname.startsWith(x.to))?.tier ?? 'subtle'

  return (
    <div className="app">
      <NetBackground tier={active} />
      {/* 桌面 ≥1024：左侧边栏（大纲 §16）；768-1024 与移动：底部导航单列 */}
      <aside className="app-sidebar">
        <div className="app-sidebar__brand t-h2">Epoch</div>
        <nav aria-label={t('a11y.switchTab', { name: '' }) || undefined} className="app-sidebar__nav">
          {TABS.map(({ to, key, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `app-sidebar__link ${isActive ? 'on' : ''}`}>
              <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
              <span>{t(key)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="app-main no-scrollbar">
        {children ?? <Outlet />}
      </main>
      <nav className="app-tabbar" aria-label="primary">
        {TABS.map(({ to, key, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `app-tab ${isActive ? 'on' : ''}`}
            aria-label={t('a11y.switchTab', { name: t(key) })}
          >
            <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
            <span>{t(key)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
