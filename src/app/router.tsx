import { lazy, Suspense, useEffect, useState } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './AppShell'
import { HomeSkeleton } from '@/components/ui/Skeleton'

/* Phase 3 起逐屏替换为真实页面；Phase 1 用占位页验证 shell + 设计系统。 */
const HomePage = lazy(() => import('@/features/today/HomePage'))
const PlanPage = lazy(() => import('@/features/plan/PlanPage'))
const FitPage = lazy(() => import('@/features/fit/FitPage'))
const LearnPage = lazy(() => import('@/features/learn/LearnPage'))
const NotesPage = lazy(() => import('@/features/notes/NotesPage'))
const HealthPage = lazy(() => import('@/features/health/HealthPage'))
const ProgressPage = lazy(() => import('@/features/progress/ProgressPage'))
const MePage = lazy(() => import('@/features/me/MePage'))
const StylePage = lazy(() => import('@/dev/StylePage'))
const GoalPanel = lazy(() => import('@/features/goals/GoalPanel'))
const LoginPage = lazy(() => import('@/features/auth/LoginPage'))

/* 首访不再"卡一秒"（其二）：<400ms 的等待渲染空白，超时才出骨架——
   预取后切页实测 ~130ms（一次性开销 ~420ms），骨架只在真慢时出现，
   不做每次路由切换的过场动画。chunk 预取见 route-preload.ts。 */
function RouteFallback() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 400)
    return () => window.clearTimeout(t)
  }, [])
  return show ? <HomeSkeleton /> : null
}

const s = (node: React.ReactNode) => <Suspense fallback={<RouteFallback />}>{node}</Suspense>

export const router = createBrowserRouter([
  { path: '/login', element: s(<LoginPage />) },
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Navigate to="/today" replace /> },
      { path: '/today', element: s(<HomePage />) },
      { path: '/plan', element: s(<PlanPage />) },
      { path: '/fit', element: s(<FitPage />) },
      { path: '/learn', element: s(<LearnPage />) },
      { path: '/notes', element: s(<NotesPage />) },
      { path: '/progress', element: s(<ProgressPage />) },
      { path: '/me', element: s(<MePage />) },
      { path: '/goal/:id', element: s(<GoalPanel />) },
      { path: '/health', element: s(<HealthPage />) },
      { path: '/dev/style', element: s(<StylePage />) },
    ],
  },
])
