import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase, hasBackend } from './supabase'

/**
 * 账号体系（成熟模式，参考 supabase-community/auth-ui 与 0003_profiles 触发器设计）：
 *  - 注册：用户名必填、邮箱可选；无邮箱时用保留域合成 `<user>@user.epoch`（收不到邮件，
 *    所以要求项目关闭 Email Confirm——见交付说明）。
 *  - 登录：输入含 '@' → 直接当邮箱；否则按 profiles.username 查出真实 email 再密码登录。
 *  - 网络不可达（DNS 污染/离线）时提供「仅本机模式」逃生门，数据留在 localStorage。
 */

export const SYNTH_DOMAIN = '@user.epoch'

/** 账号标识 → 登录邮箱（纯函数）。 */
export function identifierToEmail(id: string): string {
  const t = id.trim().toLowerCase()
  if (t.includes('@')) return t
  return `${t}${SYNTH_DOMAIN}`
}

/** 注册：用户名只允许小写字母数字下划线（邮箱标识则原样）。 */
export function sanitizeUsername(u: string): string {
  return u.trim().toLowerCase().replace(/[^a-z0-9_\-.]/g, '')
}

export type AuthStatus = 'checking' | 'signed-in' | 'signed-out' | 'local-mode'

interface AuthState {
  status: AuthStatus
  user: User | null
  set: (s: Partial<AuthState>) => void
}

export const useAuth = create<AuthState>((set) => ({
  status: hasBackend ? 'checking' : 'local-mode',
  user: null,
  set: (s) => set(s),
}))

const LOCAL_FLAG = 'epoch-local-mode'

export function isLocalMode(): boolean {
  try { return sessionStorage.getItem(LOCAL_FLAG) === '1' } catch { return false }
}

export function enterLocalMode(): void {
  try { sessionStorage.setItem(LOCAL_FLAG, '1') } catch { /* ignore */ }
  useAuth.getState().set({ status: 'local-mode', user: null })
}

/** 启动订阅：恢复会话 + 跟随登录态变化。main.tsx 调用一次。 */
export function initAuth(): void {
  if (!supabase) return
  void supabase.auth.getSession().then(({ data }) => {
    useAuth.getState().set({ status: data.session ? 'signed-in' : 'signed-out', user: data.session?.user ?? null })
  })
  supabase.auth.onAuthStateChange((event, session) => {
    useAuth.getState().set({
      status: session ? 'signed-in' : 'signed-out',
      user: session?.user ?? null,
    })
    if (event === 'SIGNED_OUT') {
      try { sessionStorage.removeItem(LOCAL_FLAG) } catch { /* ignore */ }
    }
  })
}

export type AuthError = 'invalid_credentials' | 'username_taken' | 'email_taken' | 'weak_password' | 'confirm_needed' | 'offline' | 'unknown'

function mapError(msg: string): AuthError {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials')) return 'invalid_credentials'
  if (m.includes('already registered') || m.includes('already exists') || m.includes('unique') || m.includes('username')) return 'username_taken'
  if (m.includes('rate limit') || m.includes('failed to fetch') || m.includes('network')) return 'offline'
  if (m.includes('password')) return 'weak_password'
  return 'unknown'
}

/** 用户名 → 档案里的真实邮箱；查不到则回退合成邮箱（老注册未走触发器的兜底）。 */
async function resolveLoginEmail(identifier: string): Promise<string> {
  const id = identifier.trim()
  if (id.includes('@')) return id.toLowerCase()
  if (!supabase) return identifierToEmail(id)
  const { data } = await supabase.from('profiles').select('email').eq('username', id.toLowerCase()).maybeSingle()
  return (data?.email as string | undefined) ?? identifierToEmail(id)
}

export async function signIn(identifier: string, password: string): Promise<{ ok: true } | { ok: false; error: AuthError }> {
  if (!supabase) return { ok: false, error: 'offline' }
  try {
    const email = await resolveLoginEmail(identifier)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { ok: false, error: mapError(error.message) }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: mapError(String((e as Error)?.message ?? e)) }
  }
}

export async function signUp(username: string, email: string, password: string): Promise<{ ok: true } | { ok: false; error: AuthError }> {
  if (!supabase) return { ok: false, error: 'offline' }
  const user = sanitizeUsername(username)
  if (!user) return { ok: false, error: 'unknown' }
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim() || identifierToEmail(user),
      password,
      options: { data: { username: user } },
    })
    if (error) return { ok: false, error: mapError(error.message) }
    /* 邮箱确认开启时 session 为 null——合成邮箱收不到信，必须提示关确认 */
    if (!data.session) return { ok: false, error: 'confirm_needed' }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: mapError(String((e as Error)?.message ?? e)) }
  }
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut()
  useAuth.getState().set({ status: hasBackend ? 'signed-out' : 'local-mode', user: null })
}

/** 展示名：用户名优先，退到邮箱。 */
export function displayAccount(user: User | null): string {
  if (!user) return ''
  const u = (user.user_metadata?.username as string | undefined) ?? ''
  if (u) return u
  const email = user.email ?? ''
  return email.endsWith(SYNTH_DOMAIN) ? email.slice(0, -SYNTH_DOMAIN.length) : email
}
