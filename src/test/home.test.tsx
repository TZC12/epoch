import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import HomePage from '@/features/today/HomePage'
import { DayProgress } from '@/components/ui/DayProgress'
import { useData, initialData, isDoneToday } from '@/services/store'
import * as A from '@/services/actions'
import { todayKey } from '@/lib/dates'

const renderPage = () =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <HomePage />
      </ToastProvider>
    </MemoryRouter>,
  )

/* SegmentedPager 三页常驻 DOM——按页作用域查询（0=任务 1=事件 2=收集箱） */
const page = (i: number) => within(document.querySelectorAll('.spager__page')[i] as HTMLElement)

beforeEach(() => {
  localStorage.clear()
  useData.persist.clearStorage()
  A.__replaceStateForTests(structuredClone(initialData))
})

describe('HomePage（UX 重构：Pager + trailing 完成 + 拖拽 Sheet）', () => {
  it('日期导航：月份标签 + 五日条（今天高亮）', () => {
    renderPage()
    expect(screen.getByText(/年.*月|September/i)).toBeTruthy()
    const days = document.querySelectorAll('.datenav__day')
    expect(days).toHaveLength(5)
    expect(days[2]).toHaveClass('on')
  })

  it('Daily Journey：标签两端 + 当前节点（细条无卡，无飞机）', () => {
    renderPage()
    expect(document.querySelector('.home-dayprog .dayprog')).not.toBeNull()
    expect(document.querySelector('.home-dayprog .card')).toBeNull() // 不再是卡片
    expect(screen.getByText('07:00')).toBeInTheDocument()
    expect(screen.getByText('起床')).toBeInTheDocument()
    expect(screen.getByText('入睡')).toBeInTheDocument()
    expect(document.querySelector('.dayprog__node')).not.toBeNull()
    expect(document.querySelector('.dayprog__marker')).toBeNull() // 旧飞机已由节点取代
  })

  it('Journey 跨天与钳位（晚于入睡=100%，早于起床=0%，跨天段内正常推进）', () => {
    const mk = (h: number, m: number): Date => new Date(2026, 8, 12, h, m)
    const r1 = render(<DayProgress wake="07:00" sleep="23:30" now={mk(4, 23)} />)
    expect((r1.container.querySelector('.dayprog__node') as HTMLElement).style.left).toBe('0%')
    r1.unmount()
    const r2 = render(<DayProgress wake="07:00" sleep="23:30" now={mk(23, 50)} />)
    expect((r2.container.querySelector('.dayprog__node') as HTMLElement).style.left).toBe('100%')
    r2.unmount()
    const r3 = render(<DayProgress wake="22:00" sleep="06:00" now={mk(2, 0)} />) // 跨天：02:00 在 22:00→06:00 内
    const left = parseFloat((r3.container.querySelector('.dayprog__node') as HTMLElement).style.left)
    expect(left).toBeGreaterThan(0)
    expect(left).toBeLessThan(100)
    r3.unmount()
  })

  it('Pager 三页常驻：任务/事件/收集箱按页渲染，Tap 切换 aria-selected', () => {
    A.createTask({ title: '晨跑', time: '07:00' })
    A.captureInbox('联系供应商')
    renderPage()
    expect(page(0).getByText('晨跑')).toBeInTheDocument()
    expect(page(1).getByText('晨跑')).toBeInTheDocument() // 有时间 → 事件页同源
    expect(page(2).getByText('联系供应商')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('tab', { name: '收集箱' })[0]!)
    expect(screen.getAllByRole('tab', { name: '收集箱' })[0]!).toHaveAttribute('aria-selected', 'true')
  })

  it('任务页三段：待办（有时间）/已完成/随时', () => {
    A.createTask({ title: '晨跑', time: '07:00' })
    A.createTask({ title: '回复消息' })
    const t1 = A.createTask({ title: '已读完一章', time: '21:00' })
    A.toggleTask(t1.id)
    renderPage()
    expect(page(0).getByText('晨跑')).toBeInTheDocument()
    expect(page(0).queryByText('回复消息')).toBeNull()
    expect(page(0).queryByText('已读完一章')).toBeNull()
    fireEvent.click(page(0).getByRole('tab', { name: '已完成' }))
    expect(page(0).getByText('已读完一章')).toBeInTheDocument()
    fireEvent.click(page(0).getByRole('tab', { name: '随时' }))
    expect(page(0).getByText('回复消息')).toBeInTheDocument()
  })

  it('全完成时刻：待办段安静完成态', () => {
    const t1 = A.createTask({ title: '唯一任务', time: '08:00' })
    A.toggleTask(t1.id)
    renderPage()
    expect(page(0).getByText('今天的事都做完了')).toBeInTheDocument()
  })

  it('Main >3 → heavy 守护 + Move 移到明天', () => {
    for (const title of ['M1', 'M2', 'M3', 'M4']) {
      A.createTask({ title, tier: 'main', time: '08:00' })
    }
    renderPage()
    expect(screen.getByText('你的今天有点重。')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '移到明天' }))
    const s = useData.getState()
    const m4 = s.tasks.find((x) => x.title === 'M4')!
    expect(m4.date).toBeTruthy()
    expect(m4.date).not.toBe(todayKey())
  })

  it('点行身 → 编辑 sheet 打开并回填；保存走 updateTask（退场动画后 dialog 卸载）', async () => {
    const t1 = A.createTask({ title: '晨跑', time: '07:00', durMin: 30 })
    renderPage()
    fireEvent.click(within(document.querySelector('.tl-row') as HTMLElement).getByRole('button', { name: /晨跑/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    const titleInput = screen.getByLabelText('标题') as HTMLInputElement
    expect(titleInput.value).toBe('晨跑')
    fireEvent.change(titleInput, { target: { value: '晨跑 · 5km' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(useData.getState().tasks.find((x) => x.id === t1.id)!.title).toBe('晨跑 · 5km')
  })

  it('完成控件 trailing（role=checkbox）→ 勾选移出待办；已完成段撤销', () => {
    const t1 = A.createTask({ title: '晨跑', time: '07:00' })
    A.createTask({ title: '午饭', time: '12:30' })
    renderPage()
    const cc = page(0).getByRole('checkbox', { name: '晨跑' })
    /* trailing：控件在行内标题之后 */
    const row = document.querySelector('.tl-row')!
    expect(row.textContent).toContain('晨跑')
    expect(cc.getBoundingClientRect().left >= row.querySelector('.tl-row__body')!.getBoundingClientRect().left).toBe(true)
    fireEvent.click(cc)
    expect(isDoneToday(useData.getState().tasks.find((x) => x.id === t1.id)!, todayKey())).toBe(true)
    fireEvent.click(page(0).getByRole('tab', { name: '已完成' }))
    fireEvent.click(page(0).getByRole('checkbox', { name: '晨跑' }))
    expect(isDoneToday(useData.getState().tasks.find((x) => x.id === t1.id)!, todayKey())).toBe(false)
  })

  it('收集箱：捕获入箱 → 行安排 sheet 转真实任务', async () => {
    renderPage()
    const input = page(2).getByLabelText('收集箱') as HTMLInputElement
    fireEvent.change(input, { target: { value: '下周联系供应商' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(useData.getState().inbox.some((i) => i.title === '下周联系供应商')).toBe(true)
    fireEvent.click(page(2).getByRole('button', { name: /下周联系供应商/ }))
    fireEvent.click(screen.getByRole('button', { name: '明天' }))
    fireEvent.click(screen.getByRole('button', { name: '安排' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const s = useData.getState()
    expect(s.inbox[0]!.status).toBe('converted')
    expect(s.tasks[0]).toMatchObject({ title: '下周联系供应商' })
  })

  it('行删除 → undo toast 恢复', () => {
    A.createTask({ title: '会被删的任务', time: '09:00' })
    renderPage()
    const inner = document.querySelector('.tl-row__inner')!
    act(() => {
      fireEvent.pointerDown(inner, { clientX: 200, clientY: 100 })
      fireEvent.pointerMove(inner, { clientX: 130, clientY: 101 })
      fireEvent.pointerUp(inner)
    })
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    expect(useData.getState().tasks).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: '撤销' }))
    expect(useData.getState().tasks).toHaveLength(1)
  })

  it('urgent 任务渲染紫色状态点类', () => {
    A.createTask({ title: '急事', urgent: true, time: '09:00' })
    renderPage()
    expect(document.querySelector('.tl-row')!).toHaveClass('tl-row--urgent')
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

  it('日期导航选择明天 → 明天的任务出现在任务页', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const k = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
    A.createTask({ title: '未来的事', date: k, time: '10:00' })
    renderPage()
    expect(page(0).queryByText('未来的事')).toBeNull()
    fireEvent.click(document.querySelectorAll('.datenav__day')[3]!)
    expect(page(0).getByText('未来的事')).toBeInTheDocument()
  })
})
