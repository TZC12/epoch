import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MinimalStandards } from '../MinimalStandards'
import type { DailyTask } from '../../types/db'

function task(id: string, title: string, category: DailyTask['category'], status: 'pending' | 'done'): DailyTask {
  return {
    id,
    user_id: 'u1',
    task_date: '2026-08-22',
    template_id: null,
    title,
    time_of_day: null,
    category,
    is_minimum_standard: true,
    notes: null,
    status,
    completed_at: null,
    sort_order: 0,
  }
}

const tasks = [
  task('1', '体态训练', 'exercise', 'done'),
  task('2', '慢跑30分钟', 'exercise', 'pending'),
  task('3', '护肤', 'skincare', 'done'),
  task('4', '学习：设计', 'study', 'pending'),
  task('5', '睡觉', 'rhythm', 'done'),
]

describe('MinimalStandards', () => {
  it('渲染 5 项最低标准', () => {
    render(<MinimalStandards tasks={tasks} queue={[]} />)
    expect(screen.getByText('体态训练')).toBeInTheDocument()
    expect(screen.getByText('慢跑30分钟')).toBeInTheDocument()
    expect(screen.getByText('护肤')).toBeInTheDocument()
    expect(screen.getByText('学习：设计')).toBeInTheDocument()
    expect(screen.getByText('睡觉')).toBeInTheDocument()
  })

  it('完成态展示 success 样式（3 项完成 / 2 项待办）', () => {
    const { container } = render(<MinimalStandards tasks={tasks} queue={[]} />)
    const chips = Array.from(container.querySelectorAll('.MuiChip-root'))
    // 头部进度 chip（例如 3/5） + 5 个任务 chip
    expect(chips.length).toBe(6)
    const taskChips = chips.filter((c) => !/^\d+\/\d+$/.test(c.textContent?.trim() ?? ''))
    expect(taskChips.length).toBe(5)
    const doneChips = taskChips.filter((c) => c.querySelector('svg'))
    expect(doneChips.length).toBe(3)
  })

  it('无任务时不渲染', () => {
    const { container } = render(<MinimalStandards tasks={[]} queue={[]} />)
    expect(container.querySelector('section')).toBeNull()
  })
})
