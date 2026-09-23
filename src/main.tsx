import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { LucideProvider } from 'lucide-react'
import { router } from '@/app/router'
import { useTheme } from '@/lib/theme'
import { ToastProvider } from '@/components/ui/Toast'
import { boot } from '@/services'
import { initAuth } from '@/lib/auth'
import '@/lib/i18n'
import '@fontsource-variable/inter'
import '@/design/tailwind.css'
import '@/design/tokens.css'
import '@/design/global.css'

/* 主题两轴在 lib/theme 模块层自启（persist rehydrate 会 apply data-mode/data-palette）。
   这里兜底一次：万一无存储/时序异常，保证 <html> 上一定有 data-mode（必须小写）与 data-palette。 */
if (document.documentElement.dataset.mode !== 'dark' && document.documentElement.dataset.mode !== 'light') {
  useTheme.getState().setMode(useTheme.getState().mode) // setMode 内部 apply（含 system 解析）
}
if (document.documentElement.dataset.palette !== 'mono' && document.documentElement.dataset.palette !== 'warm') {
  useTheme.getState().setPalette(useTheme.getState().palette)
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})

/* 数据启动：会话订阅 → legacy 迁移 → 云端 legacy 副本 → 新表同步（异步，不阻塞首帧） */
initAuth()
void boot()

/* PWA：仅生产注册 SW（dev 不注册，避免缓存干扰 HMR）。失败静默——PWA 是增强，不是依赖。 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => { /* ignore */ })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 描边唯一真值：全局 1.8，调用点不再各写各的（此前 1.6/1.7/1.8/2 散在 20 个文件）。
        显式偏离只留三档——emphasis 2（FAB / TabBar 激活）、display 1.6（≥28px 展示图标）、
        illustration 1.4（≥40px 空状态插画）。尺寸另算：14 行内 / 16 控件 / 18 分组 / 20 导航 / 22 FAB / 28 展示 / 40 插画。
        官方 motion 组件里没写 strokeWidth 的图标（bouncy-accordion 的 chevron）会一起变 1.8，这正是要的结果，故不 fork。 */}
    <LucideProvider strokeWidth={1.8}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryClientProvider>
    </LucideProvider>
  </StrictMode>,
)
