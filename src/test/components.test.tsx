import { useState } from 'react'
import type { ComponentProps } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from '@/components/ui/Checkbox'
import { HabitChip } from '@/components/ui/HabitChip'
import { Metric } from '@/components/ui/Metric'
import { Insight } from '@/components/ui/Insight'
import { Note } from '@/components/ui/Note'
import { Panel } from '@/components/ui/Panel'
import { TlRow, TlRowList } from '@/components/ui/TlRow'
import { AIPreview } from '@/components/ui/AIPreview'
import { MatrixDots } from '@/components/ui/MatrixDots'
import { Toggle } from '@/components/ui/Toggle'
import { Stepper } from '@/components/ui/Stepper'
import { Accordion } from '@/components/ui/Accordion'
import { Field } from '@/components/ui/Field'
import { cancelPointer, lift, moveTo, press, revealed, settle, surface, swipe, xOf } from './drag'

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
    expect(document.querySelector('.tl-row__state')).toHaveClass('tl-row--done')
  })

  it('指针左滑过阈值 → 露出删除；点删除回调', async () => {
    const onDelete = vi.fn()
    render(<TlRow title="回复消息" onToggle={() => {}} onDelete={onDelete} />)
    await swipe(surface(), 200, 150)
    expect(revealed()).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('横向位移不够 → 不露出', async () => {
    render(<TlRow title="整理文件" onToggle={() => {}} onDelete={() => {}} />)
    await swipe(surface(), 200, 190, { frames: 10 })   /* 10px < 40 门槛，且慢到没有甩速 */
    expect(revealed()).toBe(false)
  })

  it('幽灵窗：滑完后 450ms 内点行身 → 既不收回也不 onOpen', async () => {
    const onOpen = vi.fn()
    render(<TlRow title="读一篇文章" onOpen={onOpen} onToggle={() => {}} onDelete={() => {}} />)
    await swipe(surface(), 200, 150)
    expect(revealed()).toBe(true)
    fireEvent.click(document.querySelector('.tl-row__body')!)
    expect(onOpen).not.toHaveBeenCalled() // 幽灵窗吞掉
    expect(revealed()).toBe(true)
    await sleep(470)
    fireEvent.click(document.querySelector('.tl-row__body')!)
    expect(revealed()).toBe(false)       // 窗外点击=收回
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('纯点按（无横滑锁定）→ onOpen 直接触发（真机 setPointerCapture 回归：捕获必须延迟到锁定时）', async () => {
    const onOpen = vi.fn()
    render(<TlRow title="点开详情" onOpen={onOpen} onToggle={() => {}} onDelete={() => {}} />)
    // pointerdown 后无 move（未起 pan），直接 up + click —— 真浏览器路径
    await press(surface(), 200)
    await lift(surface(), 200)
    fireEvent.click(document.querySelector('.tl-row__body')!)
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

describe('MatrixDots（点阵加载器）', () => {
  it('scan：16 格，延迟按列 0/120/240/360ms 循环', () => {
    render(<MatrixDots variant="scan" label="拉取中" />)
    const root = screen.getByRole('status', { name: '拉取中' })
    const dots = root.querySelectorAll('i')
    expect(dots).toHaveLength(16)
    const d = (i: number) => (dots[i] as HTMLElement).style.getPropertyValue('--d')
    expect([d(0), d(1), d(2), d(3), d(4)]).toEqual(['0', '120', '240', '360', '0'])
  })

  it('orbit：四角留空、中心恒亮、环 8 格延迟递增', () => {
    render(<MatrixDots variant="orbit" />)
    const root = screen.getByRole('status', { name: '加载中' })
    const dots = [...root.querySelectorAll('i')] as HTMLElement[]
    expect(dots.filter((x) => x.classList.contains('is-gap'))).toHaveLength(4)
    expect(dots.filter((x) => x.classList.contains('is-steady'))).toHaveLength(4)
    expect(dots[1].style.getPropertyValue('--d')).toBe('0')
    expect(dots[2].style.getPropertyValue('--d')).toBe('150')
    expect(dots[4].style.getPropertyValue('--d')).toBe('1050')
  })

  it('pulse：内核 4 格先亮，其余滞后 192ms；四角留空', () => {
    render(<MatrixDots variant="pulse" />)
    const root = screen.getByRole('status', { name: '加载中' })
    const dots = [...root.querySelectorAll('i')] as HTMLElement[]
    expect(dots[5].style.getPropertyValue('--d')).toBe('0')
    expect(dots[0].className).toContain('is-gap')
    expect(dots[4].style.getPropertyValue('--d')).toBe('192')
  })
})

describe('Toggle（设定开关）', () => {
  it('role=switch：aria-checked 跟随点击，is-init 门控登场', () => {
    let on = false
    const Host = () => { const [v, setV] = useState(on); on = v; return <Toggle checked={v} onChange={() => setV(!v)} label="写周报" /> }
    render(<Host />)
    const el = screen.getByRole('switch', { name: '写周报' })
    expect(el).toHaveAttribute('aria-checked', 'false')
    expect(el.className).not.toContain('is-init')     /* 首挂载不播「关」动画 */
    fireEvent.click(el)
    expect(el).toHaveAttribute('aria-checked', 'true')
    expect(el).toHaveAttribute('data-on', 'true')
    expect(el.className).toContain('is-init')          /* 用户翻动后才挂动画门控 */
  })
})

/* ═══════ Stepper（@beui/adaptive-stepper 官方实现 + 可键入 value 的本地 fork）═══════ */
function StepHost({ initial, ...rest }: { initial: string } & Omit<ComponentProps<typeof Stepper>, 'value' | 'onChange'>) {
  const [v, setV] = useState(initial)
  return <Stepper {...rest} value={v} onChange={setV} />
}
const sBtns = (c: HTMLElement) => [...c.querySelectorAll('button')]
const sInput = (c: HTMLElement) => c.querySelector('input[type="text"]') as HTMLInputElement

describe('Stepper（± 边界自适应 + 精确键入）', () => {
  it('± 走 step 并夹在边界内；触边按钮 disabled 且退出无障碍树', () => {
    const { container } = render(<StepHost label="步数" initial="500" min={0} max={2000} step={500} />)
    const [minus, plus] = sBtns(container)
    fireEvent.click(plus); fireEvent.click(plus)
    expect(sInput(container)).toHaveValue('1500')
    fireEvent.click(plus)
    expect(sInput(container)).toHaveValue('2000')
    expect(plus).toBeDisabled()
    expect(plus).toHaveAttribute('aria-hidden', 'true')
    fireEvent.click(minus)
    expect(sInput(container)).toHaveValue('1500')
  })

  it('键盘按到边界：焦点交给对面按钮，不落进黑洞', async () => {
    const { container } = render(<StepHost label="步数" initial="500" min={0} max={2000} step={500} />)
    const [minus, plus] = sBtns(container)
    fireEvent.click(minus, { detail: 0 })
    expect(sInput(container)).toHaveValue('0')
    await sleep(60)
    expect(plus).toHaveFocus()
  })

  it('可直接键入精确值：不被 step 抹平，失焦只夹边界', () => {
    const { container } = render(<StepHost label="步数" initial="" min={0} max={60000} step={500} fallback={5000} />)
    const input = sInput(container)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '7342' } })
    fireEvent.blur(input)
    expect(sInput(container)).toHaveValue('7342')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '99999' } })
    fireEvent.blur(input)
    expect(sInput(container)).toHaveValue('60000')
  })

  it('Esc 丢弃未提交的输入', () => {
    const { container } = render(<StepHost label="步数" initial="1200" min={0} max={60000} step={500} />)
    const input = sInput(container)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '99999' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(sInput(container)).toHaveValue('1200')
  })

  it('空值显示为空而不是 0；± 从 fallback 落点起走', () => {
    const { container } = render(<StepHost label="步数" initial="" min={0} max={60000} step={500} fallback={5000} />)
    expect(sInput(container)).toHaveValue('')
    fireEvent.click(sBtns(container)[1])
    expect(sInput(container)).toHaveValue('5500')
    fireEvent.click(sBtns(container)[0])
    expect(sInput(container)).toHaveValue('5000')
  })

  it('decimals 保留小数（体重 ±0.1）', () => {
    const { container } = render(<StepHost label="体重" initial="60" min={30} max={250} step={0.1} decimals={1} />)
    fireEvent.click(sBtns(container)[1])
    expect(sInput(container)).toHaveValue('60.1')
  })

  it('上下方向键步进', () => {
    const { container } = render(<StepHost label="静息心率" initial="62" min={30} max={200} step={1} />)
    fireEvent.keyDown(sInput(container), { key: 'ArrowUp' })
    expect(sInput(container)).toHaveValue('63')
    fireEvent.keyDown(sInput(container), { key: 'ArrowDown' })
    expect(sInput(container)).toHaveValue('62')
  })

  it('无障碍名走 i18n，数值框有标签', () => {
    render(<StepHost label="步数" initial="500" min={0} max={2000} step={500} />)
    expect(screen.getByRole('button', { name: '减少步数' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '增加步数' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /步数/ })).toBeInTheDocument()
  })
})

/* ═══ 滑动释放判定（@beui/swipeable-list 官方引擎：双阈值迟滞 + 甩速 + 只开一行）═══
   手势驱动工具在 ./drag.ts——motion 的 pan 采样挂在它自己的 rAF 帧循环上，
   同一 tick 内连发 pointermove 只会被记成一个历史点，所以每步之间必须真让出一帧。 */

describe('TlRow 滑动释放判定', () => {
  /* 四轮拖拽 + 四轮弹簧落定实测 ~5s，默认 5s 超时会误报，显式放宽到 20s。 */
  it('双阈值迟滞：拖过 40px 才露出，已露出要退回 46px 以内才收回', async () => {
    render(<TlRow title="回消息" onToggle={() => {}} onDelete={() => {}} />)
    await swipe(surface(), 200, 160); await settle()        /* 露出量 40 = 门槛本身，未越过 */
    expect(revealed()).toBe(false)
    await swipe(surface(), 200, 155); await settle()        /* 45 > 40 → 露出 */
    expect(revealed()).toBe(true)
    await swipe(surface(), 155, 164, { frames: 24 }); await settle()   /* 55 > 46 且慢速 → 保持 */
    expect(revealed()).toBe(true)
    await swipe(surface(), 155, 185, { frames: 24 }); await settle()   /* 34 < 46 → 收回 */
    expect(revealed()).toBe(false)
  }, 20000)

  it('短距离快甩越过距离阈值也算打开', async () => {
    render(<TlRow title="快甩行" onToggle={() => {}} onDelete={() => {}} />)
    const el = surface()
    /* 甩速取自 getVelocity(history, 0.1)：pan 要先走过 3px 才起算，且 motion 只在
       历史点 > 2 个时淘汰陈旧起点。所以起手 4px 暖一帧，最后一帧再给 30px：
       总位移 34px < 40px 距离门槛，末帧 ≈1000px/s > 720 —— 成立理由只能是甩速。 */
    await press(el, 200)
    await moveTo(el, 196)
    await moveTo(el, 166)
    await lift(el, 166)
    await settle()                        /* 露出态与位移都在拖完之后的帧里才落定 */
    expect(revealed()).toBe(true)
  })

  it('同位移但无速度不打开（阈值仍由距离把关）', async () => {
    render(<TlRow title="慢滑行" onToggle={() => {}} onDelete={() => {}} />)
    await swipe(surface(), 200, 170, { frames: 20 })       /* 30px 摊到 20 帧 ≈ 90px/s */
    expect(revealed()).toBe(false)
  })

  it('拖过露出位后被橡皮筋压住，松手回到 -64 而不是停在越界处', async () => {
    render(<TlRow title="越界行" onToggle={() => {}} onDelete={() => {}} />)
    const el = surface()
    await press(el, 200)
    await moveTo(el, 100)                                 /* 期望 -100，约束位 -64 */
    expect(xOf(el)).toBeLessThanOrEqual(-64)
    expect(xOf(el)).toBeGreaterThan(-72)
    await lift(el, 100)
    await settle()
    expect(xOf(el)).toBeCloseTo(-64, 0)
  })

  it('纵滚被浏览器抢走（pointercancel）→ 行结算回位，不停在半截', async () => {
    render(<TlRow title="纵滑行" onToggle={() => {}} onDelete={() => {}} />)
    const el = surface()
    await press(el, 200)
    await moveTo(el, 196, 190)                            /* 主位移在纵轴 */
    await cancelPointer(el, 196)
    await settle()
    expect(revealed()).toBe(false)
    expect(xOf(el)).toBeCloseTo(0, 0)
  })

  it('pager 长按武装期（body.pagerLock）：行不让手不动，让位给翻卡', async () => {
    render(<TlRow title="让位行" onToggle={() => {}} onDelete={() => {}} />)
    document.body.dataset.pagerLock = '1'            /* MutationObserver → dragEnabled=false */
    await new Promise(r => setTimeout(r, 0))
    const el = surface()
    await press(el, 200)
    await moveTo(el, 140)
    expect(xOf(el)).toBeCloseTo(0, 0)                /* 行面纹丝不动 */
    await lift(el, 140)
    expect(revealed()).toBe(false)
    delete document.body.dataset.pagerLock
    await new Promise(r => setTimeout(r, 0))
    await swipe(el, 200, 140); await settle()        /* 解除后同一行照常可滑 */
    expect(revealed()).toBe(true)
  })

  it('同时只开一行：新行露出即收回上一行（列表级状态，见 TlRowList）', async () => {
    render(<TlRowList rows={[
      { id: 'a', title: '甲', onToggle: () => {}, onDelete: () => {} },
      { id: 'b', title: '乙', onToggle: () => {}, onDelete: () => {} },
    ]} />)
    await swipe(surface(0), 200, 140); await settle()
    expect(revealed(0)).toBe(true)
    await swipe(surface(1), 200, 140); await settle()
    expect(revealed(1)).toBe(true)
    expect(revealed(0)).toBe(false)                        /* 官方在 list 级换 value，上一行动画收回 */
  })
})

/* ═══ Field（@beui/input 官方实现 + 我们的 field.css 皮肤）═══ */
describe('Field（官方 input 引擎）', () => {
  it('label 与输入绑定；错误时 aria-invalid + aria-describedby 指向 role=alert', () => {
    render(<Field label="标题" value="" onChange={() => {}} error="要写点什么" />)
    const input = screen.getByRole('textbox', { name: '标题' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('要写点什么')
    expect(input.getAttribute('aria-describedby')).toBe(alert.id)
  })

  it('hint 占同一条消息位；出错时让位给错误文案', () => {
    const { rerender } = render(<Field label="昵称" value="" onChange={() => {}} hint="显示在你自己设备上" />)
    const hint = screen.getByText('显示在你自己设备上')
    expect(hint).toHaveAttribute('class', expect.stringContaining('text-muted-foreground'))
    expect(document.querySelector('[role="alert"]')).toBeNull()
    rerender(<Field label="昵称" value="" onChange={() => {}} hint="显示在你自己设备上" error="太长了" />)
    expect(screen.queryByText('显示在你自己设备上')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('太长了')
  })

  it('调用方仍是原生事件签名（官方 onChange 是字符串，适配器把事件带回来）', () => {
    const seen: string[] = []
    render(<Field label="标题" defaultValue="" onChange={(e) => seen.push(`${e.target.value}|${e.currentTarget.tagName}`)} />)
    fireEvent.change(screen.getByRole('textbox', { name: '标题' }), { target: { value: '跑' } })
    expect(seen).toEqual(['跑|INPUT'])
  })

  it('外观照官方：胶囊描边 + 焦点环原样保留，我们只留标记类', () => {
    render(<Field label="标题" value="" onChange={() => {}} />)
    const input = screen.getByRole('textbox', { name: '标题' })
    const box = input.parentElement!
    expect(input).toHaveClass('field__input')                 /* 页面级特例的挂钩，无样式 */
    expect(input.closest('.field')).not.toBeNull()            /* learn-page 的 :has 判断靠它 */
    expect(box).toHaveClass('h-11', 'rounded-full', 'border', 'border-border')
    expect(box).not.toHaveClass('border-0', 'ring-0', 'h-auto')  /* 不许再把官方皮撤掉 */
  })

  it('trailing 槽：控件可点且不改写输入值', () => {
    const onEye = vi.fn()
    const onChange = vi.fn()
    render(
      <Field
        label="密码"
        type="password"
        value="1234"
        onChange={onChange}
        trailing={<button type="button" aria-label="显示密码" onClick={onEye}>◉</button>}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '显示密码' }))
    expect(onEye).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()
    /* input[type=password] 在 aria-query 里没有隐式角色，只能按 label 取；
       官方自己给让位内距（pr-10），不再需要我们那条 --adorned 规则 */
    expect(screen.getByLabelText('密码')).toHaveClass('pr-10')
  })

  it('非受控也能打字；错误态由官方状态机驱动（data-state + 描边换色）', () => {
    const { rerender } = render(<Field label="域名" defaultValue="a" />)
    const input = screen.getByRole('textbox', { name: '域名' })
    fireEvent.change(input, { target: { value: 'ab' } })
    expect(input).toHaveValue('ab')
    expect(input.parentElement).toHaveAttribute('data-state', 'idle')
    rerender(<Field label="域名" defaultValue="ab" error="不合法" />)
    expect(input.parentElement).toHaveAttribute('data-state', 'error')
    expect(input.parentElement).toHaveClass('border-destructive')
    expect(input.closest('.field')!.querySelector('.field__err')).not.toBeNull()
  })
})

/* ═══ Accordion（@beui/bouncy-accordion 官方实现 + 动作行 fork）═══ */
const ACC_ITEMS = [
  { id: 'a', title: '账号', content: <p>昵称</p> },
  { id: 'b', title: '外观', content: <p>主题</p> },
  { id: 'go', title: '健康', onClick: () => {} },        /* 无 content + 有 onClick = 动作行 */
]
/** 官方把圆角/margin 写成 motion 内联样式，所以断言读 style 而不是类名 */
const accCards = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('[data-state]')]

describe('Accordion', () => {
  it('触发器是真 button，带 aria-expanded/aria-controls 指向 region', () => {
    render(<Accordion items={ACC_ITEMS} />)
    const trig = screen.getByRole('button', { name: /账号/ })
    expect(trig).toHaveAttribute('aria-expanded', 'false')
    const regionId = trig.getAttribute('aria-controls')!
    expect(regionId).toBeTruthy()
    expect(document.getElementById(regionId)).toHaveAttribute('role', 'region')
    fireEvent.click(trig)
    expect(trig).toHaveAttribute('aria-expanded', 'true')
  })

  it('单开：展开另一项时前一项自动收起；再点自己收起', () => {
    render(<Accordion items={ACC_ITEMS} />)
    const a = screen.getByRole('button', { name: /账号/ })
    const b = screen.getByRole('button', { name: /外观/ })
    fireEvent.click(a)
    fireEvent.click(b)
    expect(a).toHaveAttribute('aria-expanded', 'false')
    expect(b).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(b)
    expect(b).toHaveAttribute('aria-expanded', 'false')
  })

  it('collapsible=false 时始终留一项展开', () => {
    render(<Accordion items={ACC_ITEMS} collapsible={false} />)
    const a = screen.getByRole('button', { name: /账号/ })
    fireEvent.click(a)
    fireEvent.click(a)
    expect(a).toHaveAttribute('aria-expanded', 'true')
  })

  it('收起的面板进 inert（不可读屏、不可聚焦），展开后解除', () => {
    render(<Accordion items={ACC_ITEMS} />)
    const trig = screen.getByRole('button', { name: /账号/ })
    const panel = document.getElementById(trig.getAttribute('aria-controls')!)!
    expect(panel).toHaveAttribute('inert')
    fireEvent.click(trig)
    expect(panel).not.toHaveAttribute('inert')
  })

  it('动作行（本地 fork）不声明展开语义、不渲染面板，点击走 onClick', () => {
    const onClick = vi.fn()
    render(<Accordion items={[{ id: 'go', title: '健康', onClick }]} />)
    const trig = screen.getByRole('button', { name: /健康/ })
    expect(trig).not.toHaveAttribute('aria-expanded')
    expect(trig).not.toHaveAttribute('aria-controls')
    fireEvent.click(trig)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[role="region"]')).toBeNull()
  })

  it('副标题与右槽通过 title 组合出来（官方无此槽位）', () => {
    render(<Accordion items={[{ id: 'x', title: '外观', sub: '黑白灰 · 中文', right: '3' }]} />)
    const trig = screen.getByRole('button', { name: /外观/ })
    expect(trig).toHaveTextContent('外观')
    expect(trig).toHaveTextContent('黑白灰 · 中文')
    expect(trig).toHaveTextContent('3')
  })

  it('分组圆角：展开项四角独立成卡并让出 12px，上一行保留底圆角、下一行改收顶', async () => {
    const { container } = render(<Accordion items={ACC_ITEMS} />)
    const cards = () => accCards(container)
    expect(cards()[0].style.borderTopLeftRadius).toBe('22px')
    expect(cards()[1].style.borderTopLeftRadius).toBe('0px')
    expect(cards()[2].style.borderBottomLeftRadius).toBe('22px')

    fireEvent.click(screen.getByRole('button', { name: /外观/ }))
    /* ROW_TRANSITION 是 0.55s 带 bounce 的弹簧，中途读到的是插值（实测 16.78px）——
       这里只断言落定态，"补间真的发生"交给浏览器逐帧取证 */
    await sleep(1500)
    expect(cards()[0].style.borderBottomLeftRadius).toBe('22px')          /* 上一行仍收底 */
    expect(cards()[1].parentElement!.style.marginTop).toBe('12px')        /* 与邻居拉开 */
    expect(cards()[1].style.borderTopLeftRadius).toBe('22px')
    expect(cards()[1].style.borderBottomLeftRadius).toBe('22px')
    expect(cards()[2].style.borderTopLeftRadius).toBe('22px')             /* 下一行改收顶 */
  })
})
