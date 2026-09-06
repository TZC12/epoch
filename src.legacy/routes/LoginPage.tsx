import { useState } from 'react'
import { motion } from 'motion/react'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

type Mode = 'login' | 'register'

/** 账号规则：2-20 位字母 / 数字 / 下划线 */
const USERNAME_RE = /^[a-zA-Z0-9_]{2,20}$/

/**
 * 账号 → Supabase 邮箱映射。
 * Supabase Auth 只支持邮箱/手机号登录，这里用固定域名的合成邮箱承载账号名：
 * 你只需记住账号和密码，界面和提示中完全不出现邮箱。
 */
function emailFor(username: string): string {
  return `${username.toLowerCase()}@users.local`
}

function friendlyError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return '账号或密码不正确'
  if (/already registered|already exists|already been registered/i.test(msg))
    return '该账号已被注册，请换一个账号名'
  if (/password should be at least/i.test(msg)) return '密码至少 6 位'
  if (/fetch|network/i.test(msg)) return '无法连接 Supabase：请检查网络与 .env 配置'
  return msg
}

function EpochLogo({ className = 'size-10' }: { className?: string }) {
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

/** 登录 / 注册（账号 + 密码） */
export function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const usernameError = username.length > 0 && !USERNAME_RE.test(username)
  const passwordError = password.length > 0 && password.length < 6
  const canSubmit = USERNAME_RE.test(username) && password.length >= 6 && !busy

  function switchMode(_e: unknown, next: Mode) {
    setMode(next)
    setError(null)
  }

  async function submit() {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: emailFor(username),
          password,
        })
        if (err) setError(friendlyError(err.message))
        // 成功时 onAuthStateChange 自动切换到工作台
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email: emailFor(username),
          password,
        })
        if (err) {
          setError(friendlyError(err.message))
        } else if (!data.session) {
          // 账号模式不需要邮件确认：出现此情况说明 Supabase 开了 Confirm email
          setError(
            'Supabase 开启了邮箱确认，账号模式无法使用。请到 Dashboard → Authentication → Sign In / Providers 关闭 Confirm email 后重试。',
          )
        }
        // 关闭确认邮件时直接返回 session，注册完成自动进入工作台
      }
    } catch (e) {
      setError(friendlyError(e instanceof Error ? e.message : String(e)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-[430px] flex-col justify-center overflow-hidden bg-[var(--bg)] px-6 py-12">
      {/* 柔和装饰光斑 */}
      <div aria-hidden className="absolute -right-24 -top-24 size-64 rounded-full bg-[var(--green-accent)]/[0.08] blur-3xl" />
      <div aria-hidden className="absolute -bottom-32 -left-24 size-72 rounded-full bg-[var(--foreground)]/[0.04] blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 28 }}
        style={{ willChange: 'transform' }}
        className="relative flex flex-col items-center gap-7"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-20 items-center justify-center rounded-3xl bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg">
            <EpochLogo />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Epoch</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">每日执行闭环</p>
          </div>
        </div>

        <div className="glass-card-strong w-full rounded-2xl border border-[var(--tw-border-l1)] bg-[var(--glass-bg-strong)] p-5">
          {!isSupabaseConfigured && (
            <Alert severity="warning" sx={{ mb: 3, fontSize: 13, lineHeight: 1.6 }}>
              尚未配置 Supabase：请复制 <code>.env.example</code> 为 <code>.env</code>，填入项目地址与
              publishable key 后重启。
            </Alert>
          )}

          <div className="flex flex-col gap-4">
            {/* 登录 / 注册 分段切换 */}
            <Tabs
              value={mode}
              onChange={switchMode}
              variant="fullWidth"
              aria-label="登录或注册"
              sx={{
                minHeight: 44,
                bgcolor: 'var(--tw-overlay-2)',
                borderRadius: 3,
                p: 0.5,
                '& .MuiTabs-indicator': {
                  height: '100%',
                  borderRadius: 2,
                  bgcolor: 'var(--primary)',
                },
                '& .MuiTab-root': {
                  color: 'var(--muted-foreground)',
                  '&.Mui-selected': { color: 'var(--primary-foreground)' },
                },
              }}
            >
              <Tab label="登录" value="login" sx={{ minHeight: 40, borderRadius: 2, fontWeight: 600 }} />
              <Tab label="注册" value="register" sx={{ minHeight: 40, borderRadius: 2, fontWeight: 600 }} />
            </Tabs>

            <TextField
              label="账号"
              placeholder="2-20 位字母、数字或下划线"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              autoComplete="username"
              error={usernameError}
              helperText={usernameError ? '账号需为 2-20 位字母、数字或下划线' : undefined}
            />

            <TextField
              label="密码"
              type={showPassword ? 'text' : 'password'}
              placeholder={mode === 'login' ? '输入密码' : '设置密码（至少 6 位）'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              error={passwordError}
              helperText={passwordError ? '密码至少 6 位' : undefined}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? '隐藏密码' : '显示密码'}
                        edge="end"
                        sx={{ color: 'var(--muted-foreground)', '&:hover': { bgcolor: 'var(--tw-overlay-2)' } }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button
              variant="contained"
              size="large"
              fullWidth
              loading={busy}
              loadingPosition="start"
              disabled={!canSubmit && !busy}
              onClick={submit}
            >
              {mode === 'login' ? '登录' : '注册账号'}
            </Button>

            <div className="text-center text-[13px]">
              {mode === 'login' ? (
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="-my-1 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  style={{ transition: 'color 0.12s cubic-bezier(0.4,0,0.2,1)' }}
                >
                  还没有账号？<span className="font-medium text-[var(--foreground)]">注册</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="-my-1 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  style={{ transition: 'color 0.12s cubic-bezier(0.4,0,0.2,1)' }}
                >
                  已有账号？<span className="font-medium text-[var(--foreground)]">登录</span>
                </button>
              )}
            </div>

            {error && (
              <Alert severity="error" sx={{ fontSize: 13, lineHeight: 1.6 }}>
                {error}
              </Alert>
            )}
          </div>
        </div>

        <p className="text-center text-xs leading-5 text-[var(--muted-foreground)]">
          账号密码注册即用 · 数据实时保存在你的 Supabase
        </p>
      </motion.div>
    </div>
  )
}
