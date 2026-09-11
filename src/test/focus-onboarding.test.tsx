import { render, screen, fireEvent, act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider } from '@/components/ui/Toast'
import { FocusVeil } from '@/features/focus/FocusVeil'
import { useFocus } from '@/features/focus/focusStore'
import { useData, initialData } from '@/services/store'
import * as A from '@/services/actions'
import { Onboarding, needOnboarding, OB_KEY } from '@/features/onboarding/Onboarding'

beforeEach(() => {
  localStorage.clear()
  useData.persist.clearStorage()
  A.__replaceStateForTests(structuredClone(initialData))
  act(() => useFocus.setState({ taskId: null, title: '', seconds: 40 * 60, running: false, finished: false }))
})

describe('FocusVeil（接任务 dur + 退出保留）', () => {
  it('时长来自任务 durMin（修复审计缺口），缺省 40min', () => {
    act(() => useFocus.getState().start({ id: 't1', title: 'Deep work', durMin: 25 }))
    expect(useFocus.getState().seconds).toBe(25 * 60)
    render(<ToastProvider><FocusVeil /></ToastProvider>)
    expect(screen.getByText('Deep work')).toBeInTheDocument()
    expect(screen.getByText('25:00')).toBeInTheDocument()
  })

  it('缺省 durMin → 40:00', () => {
    act(() => useFocus.getState().start({ id: 't2', title: 'X', durMin: null }))
    expect(useFocus.getState().seconds).toBe(40 * 60)
  })

  it('toggle 暂停/恢复；到 0 → finished', () => {
    act(() => useFocus.getState().start({ id: 't3', title: 'X', durMin: null }))
    act(() => useFocus.getState().toggle())
    expect(useFocus.getState().running).toBe(true)
    act(() => useFocus.setState({ seconds: 1 }))
    act(() => useFocus.getState().tick())
    expect(useFocus.getState().finished).toBe(true)
    expect(useFocus.getState().running).toBe(false)
  })

  it('退出不清进度：resume 恢复 running', () => {
    act(() => useFocus.getState().start({ id: 't4', title: 'X', durMin: 30 }))
    act(() => useFocus.getState().toggle())
    act(() => useFocus.getState().tick()) // 29:59
    const before = useFocus.getState().seconds
    act(() => useFocus.getState().quit())
    expect(useFocus.getState().running).toBe(false)
    expect(useFocus.getState().seconds).toBe(before) // 保留
    act(() => useFocus.getState().resume())
    expect(useFocus.getState().running).toBe(true)
  })
})

describe('Onboarding（每步真落库）', () => {
  it('完成后：direction/routines/goals 全部落库 + 标记完成', () => {
    const onDone = vi.fn()
    render(<ToastProvider><Onboarding onDone={onDone} /></ToastProvider>)

    // welcome → schedule
    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    // schedule（作息默认值）→ routines
    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    // 勾选一个习惯 → direction
    fireEvent.click(screen.getByRole('button', { name: /晨间例行|Reading/ }))
    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    // direction 填一句话 → goals
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: '成为把想法做成产品的人' } })
    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    // goal 填季度目标 → 完成
    const goalInput = screen.getAllByRole('textbox').at(-1)!
    fireEvent.change(goalInput, { target: { value: '上线 v1' } })
    fireEvent.click(screen.getByRole('button', { name: '进入今天' }))

    const s = useData.getState()
    expect(s.direction.statement).toBe('成为把想法做成产品的人')
    expect(s.direction.wake).toBe('07:00')
    expect(s.routines.length).toBe(1)
    expect(s.goals.map((g) => g.title)).toContain('上线 v1')
    expect(localStorage.getItem(OB_KEY)).toBe('1')
    expect(needOnboarding()).toBe(false)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('全跳过也能进 Today（原则：写不出 Goal 可跳过）', () => {
    const onDone = vi.fn()
    render(<ToastProvider><Onboarding onDone={onDone} /></ToastProvider>)
    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    fireEvent.click(screen.getByRole('button', { name: '先跳过' }))
    fireEvent.click(screen.getByRole('button', { name: '先跳过' }))
    fireEvent.click(screen.getByRole('button', { name: '先跳过' }))
    expect(onDone).toHaveBeenCalledTimes(1)
    const s = useData.getState()
    expect(s.goals).toHaveLength(0)
    expect(s.routines).toHaveLength(0)
    expect(localStorage.getItem(OB_KEY)).toBe('1')
  })
})
