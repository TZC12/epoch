import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import HomePage from '@/features/today/HomePage'
import { useData, initialData, isDoneToday } from '@/services/store'
import * as A from '@/services/actions'
import { todayKey } from '@/lib/dates'
import { revealed, settle, surface, swipe } from './drag'

const renderPage = () =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <HomePage />
      </ToastProvider>
    </MemoryRouter>,
  )

beforeEach(() => {
  localStorage.clear()
  useData.persist.clearStorage()
  A.__replaceStateForTests(structuredClone(initialData))
})

describe('HomePage（概念稿 Today：眉题头 + MODULES + 圆环任务行）', () => {
  it('页头：TODAY 眉题 + 今日总览 + 进展入口（「我的」已移到下方导航，页头不再出现）', () => {
    renderPage()
    expect(screen.getByText(/^TODAY ·/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '今日总览' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '进展' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '我的' })).toBeNull()
  })

  it('MODULES 四卡：计划/健康/健身/学习，真实派生计数 + 路由出口 + 悬停提示文案', () => {
    A.createTask({ title: '晨跑', time: '07:00' })
    renderPage()
    const grid = document.querySelector('.home-mods')!
    const cards = within(grid as HTMLElement).getAllByRole('link')
    expect(cards.map((c) => c.getAttribute('href'))).toEqual(['/plan', '/health', '/fit', '/learn'])
    expect(cards.map((c) => c.getAttribute('data-tip'))).toEqual(['任务清单与安排', '今日健康记录', '训练与课程', '语言学习与单词'])
    expect(within(grid as HTMLElement).getByText('0/1')).toBeInTheDocument()
  })

  it('任务区：待办 TlRow ≤5 条 + 查看全部 → Plan', () => {
    for (let i = 0; i < 7; i++) A.createTask({ title: `任务${i}`, time: '08:00' })
    renderPage()
    expect(document.querySelectorAll('.tl-row:not(.inbox-row)')).toHaveLength(5)
    expect(screen.getByRole('link', { name: '查看全部' })).toHaveAttribute('href', '/plan')
  })

  it('勾选完成 → 成功 toast 且可撤销；勾选后行移出待办', () => {
    const t1 = A.createTask({ title: '晨跑', time: '07:00' })
    const t2 = A.createTask({ title: '读书', time: '08:00' })
    renderPage()
    fireEvent.click(screen.getByRole('checkbox', { name: '晨跑' }))
    expect(isDoneToday(useData.getState().tasks.find((x) => x.id === t1.id)!, todayKey())).toBe(true)
    const toastRegion = document.querySelector('.toast-region') as HTMLElement
    expect(within(toastRegion).getByText('已完成')).toBeInTheDocument()
    fireEvent.click(within(toastRegion).getByRole('button', { name: '撤销' }))
    expect(isDoneToday(useData.getState().tasks.find((x) => x.id === t1.id)!, todayKey())).toBe(false)
    fireEvent.click(screen.getByRole('checkbox', { name: '晨跑' }))
    expect(document.querySelector('.tl-row:not(.inbox-row)')).not.toBeNull() // 还剩「读书」
    void t2
  })

  it('最后一个任务勾完 → 清屏 toast + PhysicsConfetti 爆发（burst 计数生效）', () => {
    A.createTask({ title: '半程', time: '08:00' })
    A.createTask({ title: '收尾', time: '09:00' })
    renderPage()
    const cv = document.querySelector('[data-testid="confetti"]') as HTMLCanvasElement
    expect(cv).not.toBeNull()
    const spy = vi.spyOn(cv, 'getContext') // 只有 burst>0 的 effect 会取上下文=真发射
    fireEvent.click(screen.getByRole('checkbox', { name: '半程' }))
    expect(spy).not.toHaveBeenCalled() // 还有待办 → 不放
    fireEvent.click(screen.getByRole('checkbox', { name: '收尾' }))
    expect(within(document.querySelector('.toast-region') as HTMLElement).getByText('今天的事都做完了')).toBeInTheDocument()
    expect(spy).toHaveBeenCalled() // 清屏瞬间爆发已点火
    spy.mockRestore()
  })

  it('全完成：安静完成态', () => {
    const t1 = A.createTask({ title: '唯一任务', time: '08:00' })
    A.toggleTask(t1.id)
    renderPage()
    expect(screen.getByText('今天的事都做完了')).toBeInTheDocument()
  })

  it('点行身 → 编辑 sheet 回填；保存走 updateTask', async () => {
    const t1 = A.createTask({ title: '晨跑', time: '07:00' })
    renderPage()
    fireEvent.click(within(document.querySelector('.tl-row:not(.inbox-row)') as HTMLElement).getByRole('button', { name: /晨跑/ }))
    const dialog = screen.getByRole('dialog')
    const titleInput = within(dialog).getByLabelText('标题') as HTMLInputElement
    expect(titleInput.value).toBe('晨跑')
    fireEvent.change(titleInput, { target: { value: '晨跑 · 5km' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(useData.getState().tasks.find((x) => x.id === t1.id)!.title).toBe('晨跑 · 5km')
  })

  it('urgent 任务 → 行陶土态类', () => {
    A.createTask({ title: '急事', urgent: true, time: '09:00' })
    renderPage()
    expect(document.querySelector('.tl-row__state')).toHaveClass('tl-row--urgent')
  })

  it('行左滑露删除 → 点删除 → undo toast 恢复', async () => {
    A.createTask({ title: '会被删的任务', time: '09:00' })
    renderPage()
    await swipe(surface(), 300, 240); await settle()
    expect(revealed()).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    expect(useData.getState().tasks).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: '撤销' }))
    expect(useData.getState().tasks).toHaveLength(1)
  })

  it('Main >3 → heavy 守护 + Move 移到明天', () => {
    for (const title of ['M1', 'M2', 'M3', 'M4']) {
      A.createTask({ title, tier: 'main', time: '08:00' })
    }
    renderPage()
    expect(screen.getByText('你的今天有点重。')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '移到明天' }))
    const m4 = useData.getState().tasks.find((x) => x.title === 'M4')!
    expect(m4.date).toBeTruthy()
    expect(m4.date).not.toBe(todayKey())
  })

  it('首页不再渲染收集箱区块（数据层保留）', () => {
    renderPage()
    expect(screen.queryByRole('textbox', { name: '收集箱' })).toBeNull()
  })

  it('习惯条：打卡 toggle', () => {
    useData.setState({
      routines: [{ id: 'r1', goalId: null, name: 'Posture', sub: '5 min', frequency: null, time: null, durMin: null, kind: 'habit', archived: false, createdAt: '', updatedAt: '' }],
    })
    renderPage()
    const chip = screen.getByRole('button', { name: /Posture/ })
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(chip)
    expect(useData.getState().habitLogs).toHaveLength(1)
  })

  it('SELF-DISCIPLINE 英雄区：无圆环、无起床/入睡细条，百分比为老虎机 reel', () => {
    renderPage()
    expect(document.querySelector('.sd-hero__ring')).toBeNull()
    expect(document.querySelector('.home-dayprog')).toBeNull()
    expect(document.querySelector('.sd-hero__num .reel')).not.toBeNull()
  })
})
