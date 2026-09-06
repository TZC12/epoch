import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskRow } from '../TaskRow'
import type { DailyTask } from '../../types/db'

const baseTask: DailyTask = {
  id: 'task-1',
  user_id: 'u1',
  task_date: '2026-08-22',
  template_id: 't1',
  title: '慢跑30分钟',
  time_of_day: '20:15:00',
  category: 'exercise',
  is_minimum_standard: true,
  notes: '晚上跑步',
  status: 'pending',
  completed_at: null,
  sort_order: 1,
}

describe('TaskRow', () => {
  it('渲染时间、标题与最低标准标记', () => {
    render(<TaskRow task={baseTask} done={false} onToggle={() => {}} />)
    expect(screen.getByText('20:15')).toBeInTheDocument()
    expect(screen.getByText('慢跑30分钟')).toBeInTheDocument()
    expect(screen.getByText('最低标准')).toBeInTheDocument()
  })

  it('点击打卡圆钮触发 onToggle(task, true)', async () => {
    const onToggle = vi.fn()
    render(<TaskRow task={baseTask} done={false} onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('button', { name: '完成：慢跑30分钟' }))
    expect(onToggle).toHaveBeenCalledWith(baseTask, true)
  })

  it('完成后按钮显示撤销语义', () => {
    render(<TaskRow task={baseTask} done onToggle={() => {}} />)
    const btn = screen.getByRole('button', { name: '撤销完成：慢跑30分钟' })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('待同步时禁用打卡按钮', () => {
    render(<TaskRow task={baseTask} done={false} disabled onToggle={() => {}} />)
    expect(screen.getByRole('button', { name: '完成：慢跑30分钟' })).toBeDisabled()
  })

  it('点击行展开说明', async () => {
    render(<TaskRow task={baseTask} done={false} onToggle={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: '慢跑30分钟详情' }))
    expect(screen.getByText('晚上跑步')).toBeInTheDocument()
  })
})
