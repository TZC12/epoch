import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './AppShell'

/* Phase 3 起逐屏替换为真实页面；Phase 1 用占位页验证 shell + 设计系统。 */
const HomePage = lazy(() => import('@/features/today/HomePage'))
const ProgressPage = lazy(() => import('@/features/progress/ProgressPage'))
const MePage = lazy(() => import('@/features/me/MePage'))
const StylePage = lazy(() => import('@/dev/StylePage'))
const GoalPanel = lazy(() => import('@/features/goals/GoalPanel'))
const HealthPanel = lazy(() => import('@/features/health/HealthPanel'))

/* 代码分割的页面元素统一挂同一 Suspense 边界（loading 规范：无 spinner，本地 chunk 极快） */
const s = (node: React.ReactNode) => <Suspense fallback={<div className="is-loading" aria-hidden="true" />}>{node}</Suspense>

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Navigate to="/today" replace /> },
      { path: '/today', element: s(<HomePage />) },
      { path: '/plan', element: <Navigate to="/today" replace /> },   /* M9 IA：Plan 并入主页 */
      { path: '/progress', element: s(<ProgressPage />) },
      { path: '/me', element: s(<MePage />) },
      { path: '/goal/:id', element: s(<GoalPanel />) },
      { path: '/health', element: s(<HealthPanel />) },
      { path: '/dev/style', element: s(<StylePage />) },
    ],
  },
])
