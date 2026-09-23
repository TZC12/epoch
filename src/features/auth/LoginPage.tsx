import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Seg } from '@/components/ui/Seg'
import { signIn, signUp, enterLocalMode } from '@/lib/auth'
import { useFieldErr } from '@/lib/useFieldErr'
import { hasBackend } from '@/lib/supabase'
import './login.css'

type Mode = 'in' | 'up'

/**
 * 登录/注册（唯一 public 屏）。账号=用户名或邮箱，密码统一。
 * 原生表单语义：<form> + type=submit（Enter 即提交）、autocomplete=username/current-password
 * 让密码管理器可填充；密码可见切换是 type=button 的独立控件（点击绝不提交）。
 * 空输入/校验失败 → 字段红边 + transitions.dev 抖动（不再禁用按钮静默拦截）。
 * 后端不可达（DNS 污染/离线）时「仅本机使用」是第二条登录方式，用登录方式分隔线与其分隔。
 */
export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('in')
  const [id, setId] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const idErr = useFieldErr()
  const pwErr = useFieldErr()

  const submit = async (): Promise<void> => {
    if (!id.trim()) { idErr.fire(t('auth.errEmptyId')); return }
    if (pw.length < 6) { pwErr.fire(t('auth.errPwShort')); return }
    setBusy(true)
    idErr.clear()
    const res = mode === 'in' ? await signIn(id, pw) : await signUp(id, email, pw)
    setBusy(false)
    if (res.ok) { void navigate('/today', { replace: true }); return }
    idErr.fire(t(`auth.err.${res.error}`))
  }

  return (
    <div className="login">
      <div className="login__card">
        <h1 className="login__brand t-h1">Epoch · 时</h1>
        <p className="login__sub t-caption">{t('auth.tagline')}</p>
        <Seg
          options={[{ value: 'in', label: t('auth.signIn') }, { value: 'up', label: t('auth.signUp') }]}
          value={mode}
          onChange={(v) => { setMode(v); idErr.clear(); pwErr.clear() }}
          ariaLabel={t('auth.title')}
        />
        <form className="login__form" onSubmit={(e) => { e.preventDefault(); void submit() }}>
          <Field
            label={mode === 'in' ? t('auth.identifier') : t('auth.username')}
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder={mode === 'in' ? t('auth.identifierPh') : t('auth.usernamePh')}
            autoComplete="username"
            autoCapitalize="none"
            error={idErr.err ?? undefined}
            shakeKey={idErr.shakeKey}
          />
          {mode === 'up' && (
            <Field label={t('auth.emailOptional')} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" inputMode="email" autoComplete="email" />
          )}
          <Field
            label={t('auth.password')}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            type={showPw ? 'text' : 'password'}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            error={pwErr.err ?? undefined}
            shakeKey={pwErr.shakeKey}
            trailing={
              <button
                type="button"
                aria-label={showPw ? t('auth.hidePw') : t('auth.showPw')}
                aria-pressed={showPw}
                onClick={() => setShowPw((v) => !v)}
              >
                {showPw ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            }
          />
          <Button block type="submit" loading={busy}>
            {mode === 'in' ? t('auth.signIn') : t('auth.signUp')}
          </Button>
        </form>
        {mode === 'up' && <p className="login__hint t-caption">{t('auth.upHint')}</p>}
        {hasBackend && (
          <>
            {/* 登录方式分隔线：把「账号密码」与「仅本机」两条路径分开 */}
            <div className="login__or" aria-hidden="true"><span>{t('auth.or')}</span></div>
            <button type="button" className="login__local" onClick={() => { enterLocalMode(); void navigate('/today', { replace: true }) }}>
              {t('auth.localOnly')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
