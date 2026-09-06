import { useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { AuthProvider, useSession } from './lib/auth'
import { bootstrapWorkspace } from './lib/bootstrap'
import { useSyncStatus } from './hooks/useSyncStatus'
import { BottomNav } from './components/BottomNav'
import { ToastHost } from './components/Toast'
import { LoginPage } from './routes/LoginPage'
import { TodayPage } from './routes/TodayPage'
import { PlanPage } from './routes/PlanPage'
import { ProfilePage } from './routes/ProfilePage'

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
      <ToastHost />
    </AuthProvider>
  )
}

function AppGate() {
  const { session, loading } = useSession()
  if (loading) return <BootScreen label="加载中…" />
  if (!session) return <LoginPage />
  return <Workspace />
}

function EpochLogo({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BootScreen({ label }: { label: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100dvh',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        bgcolor: 'var(--bg)',
        color: 'var(--foreground)',
      }}
    >
      {/* 单色 Logo 方块 */}
      <div className="flex size-16 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg">
        <EpochLogo />
      </div>
      {/* 加载指示器 */}
      <CircularProgress size={28} sx={{ color: 'var(--foreground)' }} />
      <Typography sx={{ fontSize: 14, color: 'var(--muted-foreground)' }}>{label}</Typography>
    </Box>
  )
}

function Workspace() {
  const { session } = useSession()
  const [ready, setReady] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const queryClient = useQueryClient()

  // 首次进入引导（设置 + SOP 种子）
  useEffect(() => {
    if (!session) return
    let cancelled = false
    setBootError(null)
    bootstrapWorkspace(session.user.id)
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch((e: Error) => {
        if (!cancelled) setBootError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [session, retryKey])

  // 同步完成后刷新当日任务（离线补写的状态回读）
  const { status } = useSyncStatus()
  const prevStatus = useRef(status)
  useEffect(() => {
    if (prevStatus.current !== 'synced' && status === 'synced') {
      queryClient.invalidateQueries({ queryKey: ['daily-tasks'] })
    }
    prevStatus.current = status
  }, [status, queryClient])

  if (bootError) {
    return (
      <Box
        sx={{
          display: 'flex',
          minHeight: '100dvh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          bgcolor: 'var(--bg)',
          color: 'var(--foreground)',
          px: 2,
          textAlign: 'center',
        }}
      >
        {/* 引导失败提示 */}
        <Alert severity="error" sx={{ fontSize: 13, lineHeight: 1.6, maxWidth: 320 }}>
          初始化工作台失败：{bootError}
        </Alert>
        <Button variant="contained" onClick={() => setRetryKey((k) => k + 1)}>
          重试
        </Button>
      </Box>
    )
  }

  if (!ready) return <BootScreen label="正在准备工作台…" />

  return (
    <div className="mx-auto min-h-dvh max-w-[430px] bg-[var(--bg)] text-[var(--foreground)] transition-colors duration-300">
      <main className="pb-28">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
