import type { ReactNode } from 'react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sun, ListTodo, Dumbbell, BookOpen, StickyNote, ChartNoAxesColumn, User } from 'lucide-react'
import { NetBackground } from '@/components/NetBackground'
import { useAuth, isLocalMode } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { hasBackend } from '@/lib/supabase'
import { FocusVeil } from '@/features/focus/FocusVeil'
/* 引导层用 Field（→ motion，46 kB gz）：静态引它会把 motion 抬进入口 chunk，
   每次启动都先下载一遍（实测入口 90.45 → 100.70 kB gz）。
   判断留在 gate.ts（纯 localStorage，零依赖），组件按需拉。 */
import { needOnboarding } from '@/features/onboarding/gate'
import { useDayRollover } from '@/services/queries'
import { preloadRoutes } from './route-preload'
import './app-shell.css'

const Onboarding = lazy(() =>
  import('@/features/onboarding/Onboarding').then((m) => ({ default: m.Onboarding })),
)

/* 同 Onboarding 的理由：矩阵档背景只有选了它的人才用得到，静态引会把 ~2.4 kB gz
   抬进每个启动者都要下载的入口 chunk（实测入口 84.99 → 87.4 kB gz）。按需拉，入口回到原值。 */
const MatrixBackground = lazy(() =>
  import('@/components/MatrixBackground').then((m) => ({ default: m.MatrixBackground })),
)

/** Tab 定义（唯一导航源）。底部 TabBar 只留 今天/备忘/我的（tab: true）；
 *  计划/健身/学习 的入口在首页 MODULES 卡片，进展在页头图标——桌面侧栏仍列全部。 */
export const NAV = [
  { to: '/today', key: 'nav.today', Icon: Sun, tier: 'subtle', tab: true },
  { to: '/plan', key: 'nav.plan', Icon: ListTodo, tier: 'subtle', tab: false },
  { to: '/fit', key: 'nav.fit', Icon: Dumbbell, tier: 'ambient', tab: false },
  { to: '/learn', key: 'nav.learn', Icon: BookOpen, tier: 'ambient', tab: false },
  { to: '/notes', key: 'nav.notes', Icon: StickyNote, tier: 'subtle', tab: true },
  { to: '/progress', key: 'nav.progress', Icon: ChartNoAxesColumn, tier: 'ambient', tab: false },
  { to: '/me', key: 'nav.me', Icon: User, tier: 'subtle', tab: true },
] as const

export const TABS = NAV.filter((n) => n.tab)

export function AppShell({ children }: { children?: ReactNode }) {
  useDayRollover()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const authStatus = useAuth((s) => s.status)
  const bg = useTheme((s) => s.bg)
  const mainRef = useRef<HTMLElement>(null)
  const active = NAV.find((x) => pathname.startsWith(x.to))?.tier ?? 'subtle'
  const [obOpen, setObOpen] = useState(() => needOnboarding())

  /* 空闲预取全部页面 chunk：首访 /plan 等不再卡在按需下载/编译（route-preload.ts） */
  useEffect(() => { preloadRoutes() }, [])

  /* 路由切换回顶部：SPA 不清滚动位置会带着上一页的偏移进新页（骨架/内容都"错位"） */
  useEffect(() => { mainRef.current?.scrollTo(0, 0) }, [pathname])

  /* 守卫：配了后端且非本机模式 → 未登录一律去 /login；会话检查中先渲染壳（背景+骨架）。 */
  if (hasBackend && !isLocalMode() && authStatus !== 'signed-in') {
    if (authStatus === 'signed-out') return <Navigate to="/login" replace />
  }

  return (
    <div className="app">
      {/* 背景轴（主题里可切）：科技=粒子网络 / 矩阵=点阵网络。两者同款层级：永远在内容之下。
          矩阵档在 Suspense 加载期间不渲染任何背景层——背景缺席一帧不是错误，不要给它骨架。 */}
      {bg === 'matrix' ? (
        <Suspense fallback={null}>
          <MatrixBackground tier={active} />
        </Suspense>
      ) : (
        <NetBackground tier={active} />
      )}
      {/* 桌面 ≥1024：左侧边栏（全页面入口）；<1024 底部全宽导航 */}
      <aside className="app-sidebar">
        <div className="app-sidebar__brand t-h2">Epoch</div>
        <nav className="app-sidebar__nav">
          {NAV.map(({ to, key, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `app-sidebar__link ${isActive ? 'on' : ''}`}>
              <Icon size={20} aria-hidden="true" />
              <span>{t(key)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main ref={mainRef} className="app-main no-scrollbar">
        {/* 路由切换淡入：key 绑 pathname 让每次切换都重新挂载 + 入场动画。
            同一个区域只一个主导连续动效，用 opacity + 微位移（8px），避开布局属性。 */}
        <div key={pathname} className="app-route-in">
          {children ?? <Outlet />}
        </div>
      </main>
      <FocusVeil />
      {obOpen && (
        <Suspense fallback={null}>
          <Onboarding onDone={() => setObOpen(false)} />
        </Suspense>
      )}
      {/* 底部悬浮胶囊导航（与网页端同款）：居中圆药丸、玻璃描边 + 悬浮阴影；
          纯图标，激活 = 前景色 + 描边加粗（无填充底，点图标即切页）；文字 sr-only 留给读屏 */}
      <nav className="app-tabbar" aria-label="primary">
        {TABS.map(({ to, key, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `app-tab ${isActive ? 'on' : ''}`}
            aria-label={t('a11y.switchTab', { name: t(key) })}
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2 : undefined} aria-hidden="true" />
                <span className="sr-only">{t(key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
