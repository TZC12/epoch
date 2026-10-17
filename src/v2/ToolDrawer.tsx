import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sheet } from '@/components/ui/Sheet'
import './v2-screens.css'

/* 工具层：v2 里唯一的"页面表"。旧 7 页原样保留为工具面，这里只做入口与形状。
   ⚠ 图标不是装饰：每个 glyph 对应这面工具的真身（时钟=排程、开关=打卡、
   握手=备忘协作、柱图=数据、卡片=复习），墨线 + 一块 blob 填充。 */

export type ToolKind = 'today' | 'plan' | 'review' | 'notes' | 'progress' | 'fit' | 'health' | 'me'

const TOOLS: { kind: ToolKind; to: string; labelKey: string; subKey: string; blob: string }[] = [
  { kind: 'today', to: '/v2/today', labelKey: 'tool.today', subKey: 'tool.todaySub', blob: 'var(--blob-green)' },
  { kind: 'plan', to: '/v2/plan', labelKey: 'tool.plan', subKey: 'tool.planSub', blob: 'var(--blob-blue)' },
  { kind: 'review', to: '/v2/learn', labelKey: 'tool.review', subKey: 'tool.reviewSub', blob: 'var(--blob-amber)' },
  { kind: 'notes', to: '/v2/notes', labelKey: 'tool.notes', subKey: 'tool.notesSub', blob: 'var(--blob-magenta)' },
  { kind: 'progress', to: '/v2/progress', labelKey: 'tool.progress', subKey: 'tool.progressSub', blob: 'var(--blob-violet)' },
  { kind: 'fit', to: '/v2/fit', labelKey: 'tool.fit', subKey: 'tool.fitSub', blob: 'var(--blob-blue)' },
  { kind: 'health', to: '/v2/health', labelKey: 'tool.health', subKey: 'tool.healthSub', blob: 'var(--blob-green)' },
  /* 「我的」必须在工具层里有一格：v2 没有底部 tab，旧版靠它进主题/AI 接口/登录，
     漏了这一格就等于把设置整块弄丢。 */
  { kind: 'me', to: '/v2/me', labelKey: 'tool.me', subKey: 'tool.meSub', blob: 'var(--blob-magenta)' },
]

/** 墨线 glyph：1.8 描边 + 单块 blob 填充 + 实心墨影（这套风格的签名） */
function ToolGlyph({ kind }: { kind: ToolKind }) {
  const common = { className: 'v2g', viewBox: '0 0 48 48', 'aria-hidden': true as const }
  switch (kind) {
    case 'today':
      return (
        <svg {...common}>
          <ellipse className="v2g-shadow" cx={26} cy={40} rx={12} ry={2.6} />
          <circle className="v2g-blob" cx={24} cy={24} r={12} />
          <circle className="v2g-line" cx={24} cy={24} r={12} />
          <path className="v2g-line" d="M24 17v7l5 3" />
        </svg>
      )
    case 'plan':
      return (
        <svg {...common}>
          <ellipse className="v2g-shadow" cx={26} cy={41} rx={13} ry={2.6} />
          <rect className="v2g-line" x={7} y={15} width={34} height={18} rx={9} />
          <circle className="v2g-blob" cx={32} cy={24} r={7} />
          <path className="v2g-line" d="M32 17v-4M32 35v-4" />
        </svg>
      )
    case 'review':
      return (
        <svg {...common}>
          <ellipse className="v2g-shadow" cx={25} cy={41} rx={12} ry={2.6} />
          <rect className="v2g-blob" x={10} y={12} width={22} height={20} rx={5} />
          <rect className="v2g-line" x={15} y={16} width={22} height={20} rx={5} />
          <path className="v2g-line" d="M22 26h8M26 22v8" />
        </svg>
      )
    case 'notes':
      return (
        <svg {...common}>
          <ellipse className="v2g-shadow" cx={25} cy={41} rx={12} ry={2.6} />
          <path className="v2g-blob" d="M12 10h14l8 8v14a4 4 0 0 1-4 4H12z" />
          <path className="v2g-line" d="M14 12h12l6 6v14H14z" />
          <path className="v2g-line" d="M19 22h10M19 27h7" />
        </svg>
      )
    case 'progress':
      return (
        <svg {...common}>
          <ellipse className="v2g-shadow" cx={25} cy={41} rx={13} ry={2.6} />
          <rect className="v2g-line" x={9} y={26} width={6} height={12} rx={2} />
          <rect className="v2g-line" x={21} y={18} width={6} height={20} rx={2} />
          <rect className="v2g-blob" x={33} y={10} width={6} height={28} rx={2} />
          <rect className="v2g-line" x={33} y={10} width={6} height={28} rx={2} />
        </svg>
      )
    case 'fit':
      return (
        <svg {...common}>
          <ellipse className="v2g-shadow" cx={25} cy={41} rx={13} ry={2.6} />
          {/* 哑铃：两块板 + 一根杠；blob 落在左侧配重上。
              原先画的是"心 + 两条横线"，缩到 46px 看像给心加了删除线。 */}
          <path className="v2g-line" d="M18 24h12" />
          <rect className="v2g-blob" x={9} y={17} width={8} height={14} rx={3} />
          <rect className="v2g-line" x={9} y={17} width={8} height={14} rx={3} />
          <rect className="v2g-line" x={31} y={17} width={8} height={14} rx={3} />
        </svg>
      )
    case 'me':
      return (
        <svg {...common}>
          <ellipse className="v2g-shadow" cx={25} cy={41} rx={12} ry={2.6} />
          <circle className="v2g-blob" cx={24} cy={17} r={7} />
          <path className="v2g-line" d="M12 38c1.5-8 6-12 12-12s10.5 4 12 12" />
          <circle className="v2g-line" cx={24} cy={17} r={7} />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <ellipse className="v2g-shadow" cx={25} cy={41} rx={12} ry={2.6} />
          <path className="v2g-line" d="M8 26h8l4-9 5 16 4-7h11" />
          <circle className="v2g-blob" cx={38} cy={16} r={4} />
        </svg>
      )
  }
}

export function ToolDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const nav = useNavigate()
  return (
    <Sheet open={open} onClose={onClose} title={t('v2.tools')} tall>
      <div className="v2-tools">
        {TOOLS.map((tool) => (
          <button
            key={tool.kind}
            type="button"
            className="v2-tool v2-card"
            style={{ ['--tool-blob' as string]: tool.blob }}
            onClick={() => { onClose(); void nav(tool.to) }}
          >
            <ToolGlyph kind={tool.kind} />
            <span className="v2-tool__label t-h3">{t(tool.labelKey)}</span>
            <span className="v2-tool__sub t-caption">{t(tool.subKey)}</span>
          </button>
        ))}
      </div>
      <p className="v2-tools__note t-caption">{t('v2.toolsNote')}</p>
    </Sheet>
  )
}
