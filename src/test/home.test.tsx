import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import HomePage from '@/features/today/HomePage'
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

/** 事件提醒卡与任务行会重复同标题——卡区查询统一走 .home-card 容器。 */
const card = () => within(document.querySelector('.home-card') as HTMLElement)

beforeEach(() => {
  localStorage.clear()
  useData.persist.clearStorage()
  A.__replaceStateForTests(structuredClone(initialData))
})

describe('HomePage（M9：Today+Plan 合并）', () => {
  it('日期导航：月份标签 + 五日条（今天高亮）', () => {
    renderPage()
    expect(screen.getByText(/年.*月|September/i)).toBeTruthy()
    const days = document.querySelectorAll('.datenav__day')
    expect(days).toHaveLength(5)
    expect(days[2]).toHaveClass('on') // 选中日居中
  })

  it('日进度条：起床/入睡两端 + 飞机标记（取代仪表盘）', () => {
    renderPage()
    expect(document.querySelector('.dayprog')).not.toBeNull()
    expect(screen.getByText('07:00')).toBeInTheDocument()
    expect(document.querySelector('.dayprog__marker')).not.toBeNull()
  })

  it('三卡切换：任务/事件/收集箱', () => {
    A.createTask({ title: '晨跑', time: '07:00' })
    A.captureInbox('联系供应商')
    renderPage()
    expect(card().getByText('晨跑')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: '事件' }))
    expect(card().getByText('晨跑')).toBeInTheDocument() // 有时间 → 事件卡也有
    fireEvent.click(screen.getByRole('tab', { name: '收集箱' }))
    expect(card().getByText('联系供应商')).toBeInTheDocument()
    expect(card().queryByText('晨跑')).toBeNull()
  })

  it('任务卡三段：待办（有时间）/已完成/随时', () => {
    A.createTask({ title: '晨跑', time: '07:00' })
    A.createTask({ title: '回复消息' }) // 无时间 → 随时
    const t1 = A.createTask({ title: '已读完一章', time: '21:00' })
    A.toggleTask(t1.id)
    renderPage()
    // 待办：晨跑可见，随时与已完成不可见
    expect(card().getByText('晨跑')).toBeInTheDocument()
    expect(card().queryByText('回复消息')).toBeNull()
    expect(card().queryByText('已读完一章')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: '已完成' }))
    expect(card().getByText('已读完一章')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: '随时' }))
    expect(card().getByText('回复消息')).toBeInTheDocument()
  })

  it('全完成时刻：待办段显示安静完成态', () => {
    const t1 = A.createTask({ title: '唯一任务', time: '08:00' })
    A.toggleTask(t1.id)
    renderPage()
    expect(screen.getByText('今天的事都做完了')).toBeInTheDocument()
    expect(screen.getByText('去生活。明天见。')).toBeInTheDocument()
  })

  it('Main >3 → heavy 提示 + Move 把最新一项移到明天（守护语义迁入主页）', () => {
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
    expect(screen.queryByText('你的今天有点重。')).toBeNull()
  })

  it('点行身 → 编辑 sheet 打开并回填；保存走 updateTask', () => {
    const t1 = A.createTask({ title: '晨跑', time: '07:00', durMin: 30 })
    renderPage()
    fireEvent.click(within(document.querySelector('.tl-row') as HTMLElement).getByRole('button', { name: /晨跑/ }))
    const dlg = screen.getByRole('dialog')
    expect(dlg).toBeInTheDocument()
    const titleInput = screen.getByLabelText('标题') as HTMLInputElement
    expect(titleInput.value).toBe('晨跑')
    fireEvent.change(titleInput, { target: { value: '晨跑 · 5km' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    const saved = useData.getState().tasks.find((x) => x.id === t1.id)!
    expect(saved.title).toBe('晨跑 · 5km')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('常驻新建按钮 → createTask 入库', () => {
    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: '新建' })[0]!)
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '读书 30 分钟' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(useData.getState().tasks.map((x) => x.title)).toContain('读书 30 分钟')
  })

  it('收集箱：捕获入箱 → 行安排 sheet 转真实任务', () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: '收集箱' }))
    const input = screen.getByLabelText('收集箱') as HTMLInputElement
    fireEvent.change(input, { target: { value: '下周联系供应商' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(useData.getState().inbox.some((i) => i.title === '下周联系供应商')).toBe(true)
    // 行身 → 安排 sheet → 选明天 → 安排
    fireEvent.click(screen.getByRole('button', { name: /下周联系供应商/ }))
    const dlg = screen.getByRole('dialog')
    expect(dlg).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '明天' }))
    fireEvent.click(screen.getByRole('button', { name: '安排' }))
    const s = useData.getState()
    expect(s.inbox[0]!.status).toBe('converted')
    expect(s.tasks[0]).toMatchObject({ title: '下周联系供应商' })
    expect(s.tasks[0]!.date).not.toBeNull()
  })

  it('行删除 → undo toast 恢复（任务卡）', () => {
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

  it('习惯条：打卡 toggle（今天视图）', () => {
    useData.setState({
      routines: [{ id: 'r1', goalId: null, name: 'Posture', sub: '5 min', frequency: null, time: null, durMin: null, kind: 'habit', archived: false, createdAt: '', updatedAt: '' }],
    })
    renderPage()
    const chip = screen.getByRole('button', { name: /Posture/ })
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(chip)
    expect(useData.getState().habitLogs).toHaveLength(1)
    expect(screen.getByRole('button', { name: /Posture/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('完成勾选 → 移出待办段；在已完成段撤销回待办', () => {
    const t1 = A.createTask({ title: '晨跑', time: '07:00' })
    A.createTask({ title: '午饭', time: '12:30' })
    renderPage()
    expect(card().getByRole('checkbox', { name: '晨跑' })).toBeInTheDocument()
    fireEvent.click(card().getByRole('checkbox', { name: '晨跑' }))
    expect(isDoneToday(useData.getState().tasks.find((x) => x.id === t1.id)!, todayKey())).toBe(true)
    expect(card().queryByRole('checkbox', { name: '晨跑' })).toBeNull() // 已离开待办段
    fireEvent.click(screen.getByRole('tab', { name: '已完成' }))
    expect(card().getByRole('checkbox', { name: '晨跑' })).toBeInTheDocument()
    fireEvent.click(card().getByRole('checkbox', { name: '晨跑' })) // 撤销
    expect(isDoneToday(useData.getState().tasks.find((x) => x.id === t1.id)!, todayKey())).toBe(false)
    fireEvent.click(screen.getByRole('tab', { name: '待办' }))
    expect(card().getByRole('checkbox', { name: '晨跑' })).toBeInTheDocument()
  })

  it('日期导航选择明天 → 显示明天的任务（已排语义由日期条承担）', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const k = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
    A.createTask({ title: '未来的事', date: k, time: '10:00' })
    renderPage()
    expect(screen.queryByText('未来的事')).toBeNull() // 默认今天
    const days = document.querySelectorAll('.datenav__day')
    fireEvent.click(days[3]!) // 选中日+1 = 明天
    expect(screen.getByText('未来的事')).toBeInTheDocument()
  })
})
