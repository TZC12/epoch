import { create } from 'zustand'

/**
 * Focus 全屏专注（1:1 迁移 legacy 语义 + 修复审计缺口「接任务 dur」）：
 * - 时长 = 任务 durMin（缺省 40）
 * - start/pause/resume；退出不清进度，toast「回去继续」可恢复
 */
interface FocusState {
  taskId: string | null
  title: string
  seconds: number
  running: boolean
  finished: boolean
  start: (task: { id: string; title: string; durMin: number | null }) => void
  toggle: () => void
  tick: () => void
  quit: () => void
  resume: () => void
}

export const useFocus = create<FocusState>((set) => ({
  taskId: null,
  title: '',
  seconds: 40 * 60,
  running: false,
  finished: false,
  start: (task) => set({
    taskId: task.id,
    title: task.title,
    seconds: Math.max(1, (task.durMin ?? 40) * 60),
    running: false,
    finished: false,
  }),
  toggle: () => set((s) => (s.finished ? s : { running: !s.running })),
  tick: () => set((s) => {
    if (!s.running) return s
    if (s.seconds <= 1) return { seconds: 0, running: false, finished: true }
    return { seconds: s.seconds - 1 }
  }),
  quit: () => set({ running: false }),
  resume: () => set((s) => (s.finished ? s : { running: true })),
}))

/** 每秒驱动（FocusVeil 挂载时接管 interval）。 */
export function useFocusTicker(): void {
  // 由 FocusVeil 内 useEffect 实现，这里仅导出语义占位防止误用
}
