import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase 客户端。
 * env 经 Vite 注入（envPrefix 含 SUPABASE_，复用 .env 既有键）：
 *   SUPABASE_URL / SUPABASE_ANON_KEY（anon key 是公开标识；安全边界在 RLS）
 * 本地 dev 也可用 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 覆盖。
 */
const url = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '') as string
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || '') as string

export const supabase: SupabaseClient | null = url && anonKey
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

export const hasBackend = supabase !== null
