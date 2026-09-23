import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, type RenderResult } from '@testing-library/react'
import { prefersReducedMotion, hasReducedMotionListener } from 'motion-dom'
import { WheelPicker } from '@/components/motion/wheel-picker'
import { TimeWheel } from '@/components/ui/TimeWheel'

/**
 * motion 的 useReducedMotion 读的是模块级 ref（首帧取值，监听器只在真实媒体查询变化时刷新），
 * 所以浏览器里事后改写 matchMedia 骗不过它——降级分支只能在这里断言。
 * hasReducedMotionListener 要先置 true，否则渲染期的 initPrefersReducedMotion() 会把我们设的值冲掉。
 */
function setReduced(on: boolean): void {
  hasReducedMotionListener.current = true
  prefersReducedMotion.current = on
}

const H = ['07', '08', '09']

afterEach(() => {
  cleanup()
  setReduced(false)
  vi.restoreAllMocks()
})

/** 降级列表里按可见文案找按钮（时列 00–23、分列 00–55 步进 5，靠下标太脆） */
function clickOption(scope: HTMLElement, text: string): void {
  const btn = [...scope.querySelectorAll('button')].find((b) => b.textContent === text)
  if (!btn) throw new Error(`option ${text} not found`)
  fireEvent.click(btn)
}

describe('WheelPicker（beui 官方鼓轮）', () => {
  it('常规路径渲染 3D 鼓轮：role=listbox + 每选项一行，不暴露可点按钮', () => {
    setReduced(false)
    const { container } = render(<WheelPicker options={H} defaultValue="08" aria-label="时" />)
    expect(screen.getByRole('listbox')).toBeTruthy()
    // 两层：dimmed 鼓面 + 中央清晰带，各 3 行（同一只鼓的两次投影，官方设计如此）
    const uls = container.querySelectorAll('ul')
    expect(uls).toHaveLength(2)
    expect(uls[0].children).toHaveLength(3)
    expect(container.querySelectorAll('button')).toHaveLength(0)
  })

  it('减弱动效降级成可点列表：无 listbox，每选项一个 button，点谁就是谁', () => {
    setReduced(true)
    const onValueChange = vi.fn()
    const { container } = render(
      <WheelPicker options={H} defaultValue="08" onValueChange={onValueChange} aria-label="时" />,
    )
    expect(container.querySelector('[role="listbox"]')).toBeNull()
    expect(container.querySelectorAll('button')).toHaveLength(3)
    clickOption(container, '09')
    expect(onValueChange).toHaveBeenCalledWith('09')
  })
})

describe('TimeWheel（两列适配器）', () => {
  const colsOf = (r: RenderResult) => r.container.querySelectorAll('.twheel__cols > div')

  it('两列各自的选择合成回一个 HH:mm：动分钟不许把小时带跑', () => {
    setReduced(true)
    const onChange = vi.fn()
    const r = render(<TimeWheel value={null} onChange={onChange} clearLabel="清除" label="时间" hourLabel="小时" minuteLabel="分钟" />)
    // 起点是默认落位 08:00——官方 emit 对同值不重播，所以要挑一个真的变化
    clickOption(colsOf(r)[0] as HTMLElement, '09')
    expect(onChange).toHaveBeenLastCalledWith('09:00')

    onChange.mockClear()
    r.rerender(<TimeWheel value="09:00" onChange={onChange} clearLabel="清除" label="时间" hourLabel="小时" minuteLabel="分钟" />)
    clickOption(colsOf(r)[1] as HTMLElement, '30')
    expect(onChange).toHaveBeenLastCalledWith('09:30')
    // 适配器是全受控的：播报跟着 value 走，所以要由调用方回填后再断言
    r.rerender(<TimeWheel value="09:30" onChange={onChange} clearLabel="清除" label="时间" hourLabel="小时" minuteLabel="分钟" />)
    expect(screen.getByRole('status').textContent).toContain('分钟 30')
  })

  it('清除钮回传 null（=未设定时间）', () => {
    setReduced(true)
    const onChange = vi.fn()
    render(<TimeWheel value="08:30" onChange={onChange} clearLabel="清除" label="时间" hourLabel="小时" minuteLabel="分钟" />)
    fireEvent.click(screen.getByRole('button', { name: '清除' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
