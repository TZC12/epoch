import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Seg } from '@/components/ui/Seg'
import { Chip } from '@/components/ui/Chip'
import { Sheet } from '@/components/ui/Sheet'
import { Panel } from '@/components/ui/Panel'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { Row } from '@/components/ui/Row'
import { EmptyState } from '@/components/ui/EmptyState'
import { Gauge } from '@/components/ui/Gauge'
import { Pbar } from '@/components/ui/Pbar'
import { Checkbox } from '@/components/ui/Checkbox'
import { Toggle } from '@/components/ui/Toggle'
import { Metric } from '@/components/ui/Metric'
import { Insight } from '@/components/ui/Insight'
import { Note } from '@/components/ui/Note'
import { TlRow } from '@/components/ui/TlRow'
import { HabitChip } from '@/components/ui/HabitChip'
import { AIPreview, type AIProposal } from '@/components/ui/AIPreview'
import { Loader, type LoaderVariant } from '@/components/motion/loader'
import { Spinner } from '@/components/ui/Feedback'
import { MatrixDots } from '@/components/ui/MatrixDots'
import { ThinkingStates } from '@/components/ui/ThinkingStates'
import { PhysicsConfetti } from '@/components/ui/PhysicsConfetti'
import { ThinkingOrb } from 'thinking-orbs'

/* dev-only 设计系统目录（用户偏好：演示工具不进产品 UI，只挂 /dev/style）。 */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 'var(--sp-6)' }}>
      <h3 className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>{title}</h3>
      {children}
    </section>
  )
}

/** 官方 Loader 的 17 变体一次全展，附我们的选型口径（口径写在这里，别散进各产品页注释）。 */
const LOADER_CATALOG: [LoaderVariant, string][] = [
  ['spinner', '内联小位·按钮旁'],
  ['dots', '短处理·AI 生成中'],
  ['bars', '后台批量'],
  ['dot-matrix', '成块数据填充'],
  ['dither', '同上，更静'],
  ['morph', '状态互换'],
  ['comet', '拖尾指向'],
  ['scramble', '文本重排'],
  ['metaballs', '融合（慎用，抢戏）'],
  ['newton', '物理摆动'],
  ['helix', '双轨'],
  ['percent', '真知道百分比时'],
  ['ascii', '终端帧（CLI 味）'],
  ['ascii-line', '线框旋转'],
  ['ascii-braille', '盲文点'],
  ['ascii-blocks', '柱状起伏'],
  ['ascii-bounce', '弹跳点'],
]

/** 色板：语义 token 全量样张（Paper Mono 单色方向的可视化清单）。 */
function ColorSection() {
  const swatches: [string, string][] = [
    ['--bg', 'bg'], ['--surface', 'surface'], ['--surface-sunken', 'sunken'],
    ['--text-primary', 'primary'], ['--text-secondary', 'secondary'], ['--text-tertiary', 'tertiary'], ['--text-disabled', 'disabled'],
    ['--ink', 'ink（主操作）'], ['--accent', 'accent（完成/活跃）'], ['--urgent', 'urgent'],
    ['--success', 'success'], ['--warning', 'warning'], ['--danger', 'danger'], ['--info', 'info'],
    ['--divider', 'divider'], ['--glass', 'glass（仅浮层）'],
  ]
  return (
    <Section title="Color · 语义色板（Paper Mono）">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-3)' }}>
        {swatches.map(([tok, name]) => (
          <div key={tok}>
            <div style={{
              height: 44, borderRadius: 'var(--r-sm)', background: `var(${tok})`,
              border: '1px solid var(--divider)',
            }} />
            <p className="t-caption" style={{ marginTop: 'var(--sp-1)' }}>{name}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

/** 字阶：七级 utilities 样张（每级真实渲染）。 */
function TypeSection() {
  const levels = ['t-display', 't-h1', 't-h2', 't-h3', 't-body', 't-small', 't-caption'] as const
  const names = ['display 40/300', 'h1 32/600', 'h2 24/600', 'h3 20/600', 'body 16/400', 'small 14/400', 'caption 12/400']
  return (
    <Section title="Type · 七级字阶">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {levels.map((cls, i) => (
          <div key={cls}>
            <p className={cls} style={{ color: 'var(--text-primary)' }}>时间塑造自己 {i === 0 ? '326%' : 'Shape 326%'}</p>
            <p className="t-caption tnum">{names[i]}</p>
          </div>
        ))}
        <p className="eyebrow">eyebrow · 区块小标签</p>
      </div>
    </Section>
  )
}

function Demo() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [ck, setCk] = useState(false)
  const [tgl, setTgl] = useState(true)
  const [note, setNote] = useState('')
  const [seg, setSeg] = useState('inbox')
  const [sheet, setSheet] = useState(false)
  const [burst, setBurst] = useState(0)
  const [panel, setPanel] = useState(false)
  const [ai, setAi] = useState(false)
  const [accepted, setAccepted] = useState<ReadonlySet<string>>(new Set())
  const frame = useRef<HTMLDivElement>(null)

  const proposals: AIProposal[] = [
    { id: 'p1', type: 'create_task', title: '把「读一篇文章」排到今天 20:00', detail: '最近三天都空到了 22:00 之后' },
    { id: 'p2', type: 'move_task', title: 'Run · 30 min 改到明天 07:00', detail: '昨晚睡眠比均值少 1.2h' },
  ]
  const toggle = (id: string) => {
    setAccepted((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div ref={frame}>
      <Section title="Button · 3 变体 + danger">
        <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          <Button onClick={() => toast(t('common.saved'), { tone: 'success' })}>Primary</Button>
          <Button variant="quiet">Quiet</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <IconButton icon={<span aria-hidden="true">＋</span>} label="add" />
        </div>
      </Section>

      <Section title="Checkbox · HabitChip · Chip · Seg · Toggle">
        <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <Checkbox checked={ck} onChange={setCk} label="demo" />
          <Toggle checked={tgl} onChange={() => setTgl((v) => !v)} label="写周报（设定开关）" />
          <HabitChip name="Posture" sub="5 min" done />
          <HabitChip name="Reading" sub="20 min" streak={12} onToggle={() => {}} />
          <Chip>Tag</Chip>
        </div>
        <div style={{ marginTop: 'var(--sp-3)' }}>
          <Seg
            options={[
              { value: 'inbox', label: '收集箱' },
              { value: 'today', label: '今天' },
              { value: 'sched', label: '已排' },
            ]}
            value={seg}
            onChange={setSeg}
            ariaLabel="demo"
          />
        </div>
      </Section>

      <Section title="Field · Note">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <Field label="标题" placeholder="想到什么写什么" />
          <Note label="备注" value={note} onChange={setNote} placeholder="只记录一句为什么" maxLength={80} />
        </div>
      </Section>

      <Section title="Loaders · 加载动效规格（按场景选型）">
        <p className="t-caption">
          加载族唯一实现 = beui 官方 <code>Loader</code>（src/components/motion/loader，17 变体、单一 size 派生、currentColor、
          减弱动效下所有 transform 换成一次平静的 opacity 脉冲）。选型口径：内联小位用 spinner/dots，
          成块数据用 dot-matrix/dither，percent 只在真知道百分比时用。
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--sp-6)', flexWrap: 'wrap', marginTop: 'var(--sp-3)' }}>
          {LOADER_CATALOG.map(([variant, cap]) => (
            <div key={variant} style={{ textAlign: 'center', width: 108 }}>
              <Loader variant={variant} size={32} label={cap} />
              <div className="t-caption">{variant} · {cap}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-6)', flexWrap: 'wrap', marginTop: 'var(--sp-4)' }}>
          <Spinner size={16} />
          <span className="t-caption">
            Button 内联圆环走 CSS（Feedback/Spinner），不走 Loader——Button 在入口 chunk 里，
            引 Loader 就会把 motion（46 kB gz）抬进首屏每次启动都下的那份包。
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flexWrap: 'wrap', marginTop: 'var(--sp-4)' }}>
          <ThinkingOrb state="composing" size={64} />
          <ThinkingOrb state="searching" size={64} />
          <ThinkingOrb state="breathing" size={64} />
          <span className="t-caption"><ThinkingOrb state="working" size={20} style={{ verticalAlign: 'middle' }} aria-hidden="true" /> 20px 内联档 · AI 思考态（AIPreview 用 composing）</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-5) 0', textAlign: 'center' }}>
          <ThinkingStates states={['正在打开这一页…', '稍候，马上好…', '整理你的数据…']} className="t-h3" />
        </div>
        <p className="t-caption">Thinking states · 骨架大空区（屏幕居中唯一元素）：shimmer 扫字形，每 2s 换一行状态，换行=上浮淡出/下方落回。</p>
        <p className="t-caption">线性进度条（LoaderBar）见路由切换时顶部 2px 扫掠。</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--sp-6)', flexWrap: 'wrap', marginTop: 'var(--sp-4)' }}>
          <div style={{ textAlign: 'center' }}>
            <MatrixDots variant="scan" />
            <div className="t-caption">点阵 scan · 逐列扫（数据填充）</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <MatrixDots variant="twinkle" />
            <div className="t-caption">twinkle · 乱序闪烁（后台拉取）</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <MatrixDots variant="orbit" dot={3} />
            <div className="t-caption">orbit · 环形巡游（AI 生成，AIPreview 用）</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <MatrixDots variant="pulse" />
            <div className="t-caption">pulse · 内核先亮外圈跟进</div>
          </div>
        </div>
      </Section>

      <Section title="PhysicsConfetti · 完成庆祝（一次性爆发）">
        <Button onClick={() => setBurst((n) => n + 1)}>发射一次</Button>
        <p className="t-caption" style={{ marginTop: 'var(--sp-2)' }}>
          今日任务全部勾完时自动触发（今天页）。canvas 物理：重力+阻力+自旋翻面；颜色取当前主题 token，换肤跟随；reduced-motion 只静态闪现落位。
        </p>
        <PhysicsConfetti burst={burst} />
      </Section>

      <Section title="Card 三档 · Metric · Insight">
        <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          <Card tone="flat" style={{ flex: 1 }}>flat</Card>
          <Card tone="sunken" style={{ flex: 1 }}>sunken</Card>
          <Card tone="glass" style={{ flex: 1 }}>glass</Card>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-6)', marginTop: 'var(--sp-4)' }}>
          <Metric label="已完成" value="3" sub="共 5 项" />
          <Metric label="连续记录" value="62%" sub="本季" />
        </div>
        <div style={{ marginTop: 'var(--sp-3)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <Insight title="你的今天有点重" body="要不要把一项移到明天？" actions={<Button size="sm" variant="quiet">Move</Button>} />
          <Insight tone="accent" title="能量不错" body="按计划推进 Run。" />
        </div>
      </Section>

      <Section title="TlRow · Row · Pbar · Gauge">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          <TlRow title="Run · 30 min" time="20:15" duration={30} tier="main" goal="Health" done={false} onToggle={() => {}} onOpen={() => {}} onDelete={() => {}} />
          <TlRow title="上班 · 专注工作" time="07:30" duration={600} done onToggle={() => {}} onOpen={() => {}} onDelete={() => {}} />
          <TlRow title="Learn · Product Design" time="22:00" duration={45} urgent onToggle={() => {}} onOpen={() => {}} onDelete={() => {}} />
          <p className="t-caption">第三行前的小圆点 = urgent 语义色（--urgent），仅标记紧急任务，非装饰。</p>
        </div>
        <div style={{ marginTop: 'var(--sp-3)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <Row title="目标 · Learn automotive systems" sub="Quarter" right="62%" chevron onClick={() => {}} />
          <Pbar pct={62} />
        </div>
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <Gauge pct={60} done={3} total={5} sub="已完成" />
        </div>
      </Section>

      <Section title="Sheet · Panel · Toast · AIPreview">
        <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          <Button variant="quiet" onClick={() => setSheet(true)}>Sheet</Button>
          <Button variant="quiet" onClick={() => setPanel(true)}>Panel</Button>
          <Button variant="quiet" onClick={() => toast('已删除', { action: { label: t('common.undo'), onClick: () => toast(t('common.saved')) } })}>Toast + undo</Button>
          <Button variant="quiet" onClick={() => setAi(true)}>AIPreview</Button>
        </div>
      </Section>

      <Section title="EmptyState">
        <EmptyState title="Nothing waiting." sub="Your day is clear." action={<Button variant="quiet">{t('today.planMyDay')}</Button>} />
      </Section>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Sheet 标题" footer={<Button block>保存</Button>}>
        <p className="t-body">底部弹层唯一容器。</p>
      </Sheet>

      <Panel open={panel} title="Panel 标题" onBack={() => setPanel(false)} backLabel={t('common.back')}>
        <p className="t-body">不透明毛玻璃底次级页。</p>
      </Panel>

      <AIPreview
        open={ai}
        onClose={() => setAi(false)}
        title="AI 建议"
        proposals={proposals}
        accepted={accepted}
        onToggle={toggle}
        onApply={() => { setAi(false); toast('已应用', { tone: 'success' }) }}
        applyLabel="应用所选"
        closeLabel={t('common.cancel')}
      />
    </div>
  )
}

export default function StylePage() {
  return (
    <ToastProvider>
      <div style={{ padding: 'var(--sp-2) 0' }}>
        <h1 className="t-h1" style={{ marginBottom: 'var(--sp-5)' }}>Design System</h1>
        <ColorSection />
        <TypeSection />
        <Demo />
      </div>
    </ToastProvider>
  )
}
