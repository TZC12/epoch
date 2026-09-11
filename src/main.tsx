import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { useTheme } from '@/lib/theme'
import { ToastProvider } from '@/components/ui/Toast'
import { boot } from '@/services'
import '@/lib/i18n'
import '@fontsource-variable/inter'
import '@/design/tokens.css'
import '@/design/global.css'

/* 主题三态在 lib/theme 模块层自启（persist rehydrate 会 apply data-mode）。
   这里兜底一次：万一无存储/时序异常，保证 <html> 上一定有 data-mode（必须小写）。 */
if (document.documentElement.dataset.mode !== 'dark' && document.documentElement.dataset.mode !== 'light') {
  useTheme.getState().setMode(useTheme.getState().mode) // setMode 内部 apply（含 system 解析）
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})

/* 数据启动：legacy 迁移 → 云端 legacy 副本 → 新表同步（异步，不阻塞首帧） */
void boot()

/* PWA：仅生产注册 SW（dev 不注册，避免缓存干扰 HMR）。失败静默——PWA 是增强，不是依赖。 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => { /* ignore */ })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)
