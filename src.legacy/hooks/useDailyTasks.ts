import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { syncQueue } from '../lib/sync-queue'
import { toast } from '../lib/toast'
import type { DailyTask } from '../types/db'

/** 打开某日时先生成（幂等）再拉取当日任务快照 */
export function useDailyTasks(dateKey: string) {
  return useQuery({
    queryKey: ['daily-tasks', dateKey],
    queryFn: async (): Promise<DailyTask[]> => {
      const { error: genError } = await supabase.rpc('generate_daily_tasks', { p_date: dateKey })
      if (genError) throw new Error(genError.message)

      const { data, error } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('task_date', dateKey)
        .order('time_of_day', { ascending: true, nullsFirst: false })
        .order('sort_order', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as DailyTask[]
    },
    staleTime: 30_000,
  })
}

/** 打卡/撤销：乐观更新 + 进入同步队列 */
export function useToggleTask(dateKey: string) {
  const queryClient = useQueryClient()

  return useCallback(
    (task: DailyTask, nextDone: boolean) => {
      queryClient.setQueryData<DailyTask[]>(['daily-tasks', dateKey], (old) =>
        old?.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: nextDone ? ('done' as const) : ('pending' as const),
                completed_at: nextDone ? new Date().toISOString() : null,
              }
            : t,
        ),
      )
      syncQueue.enqueue(
        task.id,
        nextDone ? 'complete' : 'undo',
      )
      toast(nextDone ? '已完成' : '已撤销', nextDone ? 'success' : 'info')
    },
    [dateKey, queryClient],
  )
}
