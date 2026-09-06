import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { ThemeModeProvider, useThemeMode } from './lib/theme-mode'
import { getTheme } from './theme'
import './styles/index.css'

// Epoch 设计系统字体 Urbanist（fontsource 本地打包，避免外部 CDN 依赖）
import '@fontsource/urbanist/400.css'
import '@fontsource/urbanist/500.css'
import '@fontsource/urbanist/600.css'
import '@fontsource/urbanist/700.css'
import '@fontsource/urbanist/800.css'

registerSW({ immediate: true })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 15_000,
    },
  },
})

function ThemedApp() {
  const { mode } = useThemeMode()
  const theme = getTheme(mode)

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <ThemedApp />
      </ThemeModeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
