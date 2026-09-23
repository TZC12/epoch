import { Sheet } from './Sheet'
import { Button } from './Button'
import { Checkbox } from './Checkbox'
import { StateText } from './Feedback'
import { MatrixDots } from './MatrixDots'
import { ThinkingOrb } from 'thinking-orbs'
import { useTheme } from '@/lib/theme'
import './ai-preview.css'

export type AIProposalType = 'create_task' | 'move_task' | 'create_routine' | 'adjust_note'

export interface AIProposal {
  id: string
  type: AIProposalType
  title: string        /* 一句话摘要（用户语言，非 JSON） */
  detail?: string
}

export interface AIPreviewProps {
  open: boolean
  onClose: () => void
  title?: string
  proposals: AIProposal[]
  accepted: ReadonlySet<string>
  onToggle: (id: string) => void
  onApply?: (ids: string[]) => void
  applyLabel?: string        /* 调用方传 t() */
  closeLabel?: string
  loading?: boolean
  notes?: string[]           /* 观察项（如周复盘观察员）；只陈述，不是动作 */
}

/**
 * AI 建议预览（Understand→Generate→Preview→Confirm→Apply 的 Preview 环）。
 * 红线：AI 永不直接写库——Apply 只是把勾选的 id 交回调用方，由 services/actions 落地。
 * 逐条可接受/拒绝；无全有全无；拒绝的被记住（拒绝记忆，ai-client）。
 */
export function AIPreview({
  open, onClose, title, proposals, accepted, onToggle, onApply, applyLabel, closeLabel, loading, notes,
}: AIPreviewProps) {
  /* AI 思考态用 ThinkingOrb（thinking-orbs，MIT）：composing=编织建议的语义态；
     主题显式传入（App 用 data-mode 而非 data-theme，auto 检测会漏掉强制浅/深色） */
  const themeMode = useTheme((s) => s.mode)
  const dark = themeMode === 'dark' || (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const picked = proposals.filter((p) => accepted.has(p.id)).map((p) => p.id)
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="ai-acts">
          <Button variant="quiet" onClick={onClose}>{loading ? '取消' : closeLabel}</Button>
          <Button
            loading={loading}
            disabled={picked.length === 0}
            onClick={() => onApply?.(picked)}
          >
            {applyLabel}
          </Button>
        </div>
      }
    >
      {loading && proposals.length === 0 ? (
        <div className="ai-loading">
          <ThinkingOrb state="composing" size={64} theme={dark ? 'dark' : 'light'} aria-label="AI thinking" />
          <MatrixDots variant="orbit" dot={3} label="正在生成建议…" />
        </div>
      ) : proposals.length === 0 && (notes?.length ?? 0) === 0 ? (
        <StateText tone="neutral" icon="·">{applyLabel ?? '没有建议'}</StateText>
      ) : (
        <>
          {notes && notes.length > 0 && (
            <ul className="ai-notes">
              {notes.map((n, i) => <li key={i} className="ai-notes__item t-small">{n}</li>)}
            </ul>
          )}
          <ul className="ai-list">
            {proposals.map((p) => (
              <li key={p.id} className="ai-item">
                <Checkbox checked={accepted.has(p.id)} onChange={() => onToggle(p.id)} label={p.title} />
                <div className="ai-item__main">
                  <div className="ai-item__title t-small">{p.title}</div>
                  {p.detail && <div className="ai-item__detail t-caption">{p.detail}</div>}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  )
}
