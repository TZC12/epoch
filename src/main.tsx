import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { useTheme } from '@/lib/theme'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
