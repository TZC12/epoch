import { useState } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from '@/components/ui/Checkbox'
import { HabitChip } from '@/components/ui/HabitChip'
import { Metric } from '@/components/ui/Metric'
import { Insight } from '@/components/ui/Insight'
import { Note } from '@/components/ui/Note'
import { Panel } from '@/components/ui/Panel'
import { TlRow } from '@/components/ui/TlRow'
import { AIPreview } from '@/components/ui/AIPreview'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('Checkbox', () => {
  it('role=checkbox + aria-checked + 点击回调', () => {
    const onChange = vi.fn()
    render(<Checkbox checked={false} onChange={onChange} label="完成" />)
    const el = screen.getByRole('checkbox', { name: '完成' })
    expect(el).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(el)
    expect(onChange).toHaveBeenCalledWith(true)
  })
  it('checked 态渲染 accent 类', () => {
    render(<Checkbox checked onChange={() => {}} />)
    expect(screen.getByRole('checkbox')).toHaveClass('ck--on')
  })
})

describe('HabitChip', () => {
  it('aria-pressed 反映 done', () => {
    const onToggle = vi.fn()
    const { rerender } = render(<HabitChip name="Posture" sub="5 min" done onToggle={onToggle} />)
    const el = screen.getByRole('button', { name: /Posture/ })
    expect(el).toHaveAttribute('aria-pressed', 'true')
    expect(el).toHaveClass('hchip--on')
    fireEvent.click(el)
    expect(onToggle).toHaveBeenCalledTimes(1)
    rerender(<HabitChip name="Posture" onToggle={onToggle} />)
    expect(screen.getByRole('button', { name: /Posture/ })).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('Metric / Insight / Note', () => {
  it('Metric 渲染 label/value/sub', () => {
    render(<Metric label="已完成" value="3" sub="共 5 项" />)
    expect(screen.getByText('已完成')).toHaveClass('eyebrow')
    expect(screen.getByText('3')).toHaveClass('metric__value')
    expect(screen.getByText('共 5 项')).toBeInTheDocument()
  })
  it('Insight 渲染 + accent 点', () => {
    render(<Insight tone="accent" title="能量不错" body="按计划推进。" />)
    expect(screen.getByText('能量不错')).toBeInTheDocument()
    expect(screen.getByText('能量不错').closest('.insight')).toHaveClass('insight--accent')
  })
  it('Note 受控输入 + 计数', () => {
    let v = ''
    const Wrap = () => {
      const [val, setVal] = useState('')
      return <Note label="备注" value={val} onChange={(x) => { v = x; setVal(x) }} maxLength={80} />
    }
    render(<Wrap />)
    fireEvent.change(screen.getByLabelText('备注'), { target: { value: '只记录一句为什么' } })
    expect(v).toBe('只记录一句为什么')
    expect(screen.getByText(/\/80/)).toBeInTheDocument()
  })
})

describe('Panel', () => {
  it('open 时渲染 dialog + Escape 回调 + 锁滚动', () => {
    const onBack = vi.fn()
    render(<Panel open title="设置" onBack={onBack}><p>内容</p></Panel>)
    const dlg = screen.getByRole('dialog', { name: '设置' })
    expect(dlg).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onBack).toHaveBeenCalledTimes(1)
  })
  it('关闭时不渲染、恢复滚动', () => {
    const { unmount } = render(<Panel open title="x" onBack={() => {}}><p>y</p></Panel>)
    unmount()
    expect(document.body.style.overflow).toBe('')
    render(<Panel open={false} title="x" onBack={() => {}}><p>y</p></Panel>)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('TlRow', () => {
  it('渲染标题/时间/完成态类 + 点行身 onOpen', () => {
    const onOpen = vi.fn()
    render(<TlRow title="Run · 30 min" time="20:15" duration={30} goal="Health" onOpen={onOpen} onToggle={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Run · 30 min')).toBeInTheDocument()
    expect(screen.getByText('20:15 · 30 min · Health')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Run · 30 min/ }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('完成态：透明度类 + 删除线类', () => {
    render(<TlRow title="早餐" done onToggle={() => {}} />)
    expect(document.querySelector('.tl-row')!).toHaveClass('tl-row--done')
  })

  it('指针左滑过半 → 露出删除；点删除回调', () => {
    const onDelete = vi.fn()
    render(<TlRow title="回复消息" onToggle={() => {}} onDelete={onDelete} />)
    const inner = document.querySelector('.tl-row__inner')!
    fireEvent.pointerDown(inner, { clientX: 200, clientY: 100 })
    fireEvent.pointerMove(inner, { clientX: 150, clientY: 102 }) // dx=-50 锁定 x
    fireEvent.pointerMove(inner, { clientX: 130, clientY: 103 }) // dx=-70
    fireEvent.pointerUp(inner)
    expect(document.querySelector('.tl-row')!).toHaveClass('tl-row--reveal')
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('小幅滑动不过阈值 → 不露出；纵向位移 → 不算横滑', () => {
    render(<TlRow title="整理文件" onToggle={() => {}} onDelete={() => {}} />)
    const inner = document.querySelector('.tl-row__inner')!
    fireEvent.pointerDown(inner, { clientX: 200, clientY: 100 })
    fireEvent.pointerMove(inner, { clientX: 196, clientY: 100 }) // dx=-4 < 6
    fireEvent.pointerUp(inner)
    expect(document.querySelector('.tl-row')!).not.toHaveClass('tl-row--reveal')
    fireEvent.pointerDown(inner, { clientX: 200, clientY: 100 })
    fireEvent.pointerMove(inner, { clientX: 120, clientY: 180 }) // 纵向主位移
    fireEvent.pointerUp(inner)
    expect(document.querySelector('.tl-row')!).not.toHaveClass('tl-row--reveal')
  })

  it('幽灵窗：滑完后 450ms 内点行身 → 既不收回也不 onOpen', async () => {
    const onOpen = vi.fn()
    render(<TlRow title="读一篇文章" onOpen={onOpen} onToggle={() => {}} onDelete={() => {}} />)
    const inner = document.querySelector('.tl-row__inner')!
    act(() => {
      fireEvent.pointerDown(inner, { clientX: 200, clientY: 100 })
      fireEvent.pointerMove(inner, { clientX: 130, clientY: 101 })
      fireEvent.pointerUp(inner)
    })
    expect(document.querySelector('.tl-row')!).toHaveClass('tl-row--reveal')
    fireEvent.click(inner.querySelector('.tl-row__body')!)
    expect(onOpen).not.toHaveBeenCalled() // 幽灵窗吞掉
    expect(document.querySelector('.tl-row')!).toHaveClass('tl-row--reveal')
    await sleep(470)
    fireEvent.click(inner.querySelector('.tl-row__body')!)
    expect(document.querySelector('.tl-row')!).not.toHaveClass('tl-row--reveal') // 窗外点击=收回
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('纯点按（无横滑锁定）→ onOpen 直接触发（真机 setPointerCapture 回归：捕获必须延迟到锁定时）', () => {
    const onOpen = vi.fn()
    render(<TlRow title="点开详情" onOpen={onOpen} onToggle={() => {}} onDelete={() => {}} />)
    const inner = document.querySelector('.tl-row__inner')!
    // pointerdown 后无 move（未锁定），直接 up + click —— 真浏览器路径
    fireEvent.pointerDown(inner, { clientX: 200, clientY: 100 })
    fireEvent.pointerUp(inner)
    fireEvent.click(inner.querySelector('.tl-row__body')!)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})

describe('AIPreview', () => {
  const proposals = [
    { id: 'p1', type: 'create_task' as const, title: '排到今天 20:00' },
    { id: 'p2', type: 'move_task' as const, title: 'Run 改到明天' },
  ]

  it('渲染 proposals + 勾选 toggle', () => {
    const onToggle = vi.fn()
    render(
      <AIPreview open onClose={() => {}} proposals={proposals} accepted={new Set(['p1'])} onToggle={onToggle} applyLabel="应用" />,
    )
    expect(screen.getByText('排到今天 20:00')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '排到今天 20:00' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Run 改到明天' }))
    expect(onToggle).toHaveBeenCalledWith('p2')
  })

  it('应用只带勾选项；无勾选时按钮禁用', () => {
    const onApply = vi.fn()
    const { rerender } = render(
      <AIPreview open onClose={() => {}} proposals={proposals} accepted={new Set(['p1'])} onToggle={() => {}} onApply={onApply} applyLabel="应用" />,
    )
    fireEvent.click(screen.getByRole('button', { name: '应用' }))
    expect(onApply).toHaveBeenCalledWith(['p1'])
    rerender(
      <AIPreview open onClose={() => {}} proposals={proposals} accepted={new Set()} onToggle={() => {}} onApply={onApply} applyLabel="应用" />,
    )
    expect(screen.getByRole('button', { name: '应用' })).toBeDisabled()
  })

  it('关闭时不渲染', () => {
    render(<AIPreview open={false} onClose={() => {}} proposals={proposals} accepted={new Set()} onToggle={() => {}} />)
    expect(screen.queryByText('排到今天 20:00')).toBeNull()
  })
})
