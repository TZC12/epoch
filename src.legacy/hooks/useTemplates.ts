import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'
import type { Category, DayTheme, RoutineTemplate } from '../types/db'

export function useTemplates() {
  return useQuery({
    queryKey: ['routine-templates'],
    queryFn: async (): Promise<RoutineTemplate[]> => {
      const { data, error } = await supabase
        .from('routine_templates')
        .select('*')
        .order('time_of_day', { ascending: true, nullsFirst: false })
        .order('sort_order', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as RoutineTemplate[]
    },
  })
}

export function useDayThemes() {
  return useQuery({
    queryKey: ['day-themes'],
    queryFn: async (): Promise<DayTheme[]> => {
      const { data, error } = await supabase.from('day_themes').select('*')
      if (error) throw new Error(error.message)
      return (data ?? []) as DayTheme[]
    },
    staleTime: 5 * 60_000,
  })
}

export function useUserSettings() {
  return useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_settings').select('*').maybeSingle()
      if (error) throw new Error(error.message)
      return data
    },
    staleTime: 5 * 60_000,
  })
}

export interface TemplateInput {
  id?: string
  title: string
  time_of_day: string | null
  category: Category
  weekdays: number[]
  is_minimum_standard: boolean
  notes: string | null
  enabled: boolean
  sort_order: number
}

export function useSaveTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: TemplateInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('未登录')
      const row = { ...input, user_id: user.id }
      const { error } = input.id
        ? await supabase.from('routine_templates').update(row).eq('id', input.id)
        : await supabase.from('routine_templates').insert(row)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routine-templates'] })
      qc.invalidateQueries({ queryKey: ['daily-tasks'] })
      toast('已保存，未来日期将按新模板生成', 'success')
    },
    onError: (e: Error) => toast(`保存失败：${e.message}`, 'error'),
  })
}

export function useSetTemplateEnabled() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from('routine_templates').update({ enabled }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routine-templates'] })
      qc.invalidateQueries({ queryKey: ['daily-tasks'] })
    },
    onError: (e: Error) => toast(`操作失败：${e.message}`, 'error'),
  })
}

export function useSaveTheme() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ weekday, theme }: { weekday: number; theme: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('未登录')
      const { error } = await supabase
        .from('day_themes')
        .upsert({ user_id: user.id, weekday, theme }, { onConflict: 'user_id,weekday' })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['day-themes'] })
      toast('主题已更新', 'success')
    },
    onError: (e: Error) => toast(`保存失败：${e.message}`, 'error'),
  })
}
