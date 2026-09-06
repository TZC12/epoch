import { supabase } from './supabase'
import { DAY_THEMES, SOP_TEMPLATES } from '../seed/sop'

const inflight = new Map<string, Promise<void>>()

/**
 * 首次登录引导（幂等）：
 * 1. 确保 user_settings 存在
 * 2. 模板表为空时写入 SOP 种子模板与每日主题
 * 3. 标记 template_seed_version，此后编辑不再被种子覆盖
 */
export function bootstrapWorkspace(userId: string): Promise<void> {
  const existing = inflight.get(userId)
  if (existing) return existing
  const p = doBootstrap(userId).catch((e: unknown) => {
    inflight.delete(userId)
    throw e
  })
  inflight.set(userId, p)
  return p
}

async function doBootstrap(userId: string): Promise<void> {
  // 1) 设置行（upsert 防并发冲突）
  const { data: settings } = await supabase
    .from('user_settings')
    .select('template_seed_version')
    .eq('user_id', userId)
    .maybeSingle()

  if (!settings) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, timezone }, { onConflict: 'user_id' })
    if (error) throw new Error(error.message)
  }

  if ((settings?.template_seed_version ?? 0) >= 1) return

  // 2) 模板为空则写入种子（单条 INSERT 语句原子写入）
  const { count, error: countError } = await supabase
    .from('routine_templates')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (countError) throw new Error(countError.message)

  if (count === 0) {
    const rows = SOP_TEMPLATES.map((t) => ({ ...t, user_id: userId }))
    const { error: insertError } = await supabase.from('routine_templates').insert(rows)
    if (insertError) throw new Error(insertError.message)

    const themes = DAY_THEMES.map((d) => ({ ...d, user_id: userId }))
    const { error: themeError } = await supabase
      .from('day_themes')
      .upsert(themes, { onConflict: 'user_id,weekday' })
    if (themeError) throw new Error(themeError.message)
  }

  // 3) 标记种子版本
  const { error: markError } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, template_seed_version: 1 }, { onConflict: 'user_id' })
  if (markError) throw new Error(markError.message)
}
