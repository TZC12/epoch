import { CompletionControl } from './CompletionControl'
import { useSwipeReveal } from './swipe'
import './tl-row.css'

export type TaskTier = 'main' | 'block' | 'anytime'

export interface TlRowProps {
  title: string
  time?: string | null
  duration?: number | null      /* 分钟 */
  tier?: TaskTier
  urgent?: boolean
  done?: boolean
  goal?: string | null
  note?: string | null
  deleteLabel?: string          /* 调用方传 t('common.delete')；ui 不直接依赖 i18n */
  checkLabel?: string
  onToggle?: () => void
  onOpen?: () => void
  onDelete?: () => void
}

/**
 * 任务行（hero 行，§六重构）：标题=Primary 左，完成=Trailing 右；
 * 完成动画由 CompletionControl 承担（○→◉→✓+划线过渡）；
 * 左滑露删除（手势仲裁：pager 锁定期间让位，见 useSwipeReveal）。
 */
export function TlRow({
  title, time, duration, urgent, done, goal, note,
  deleteLabel = '删除', checkLabel, onToggle, onOpen, onDelete,
}: TlRowProps) {
  const sw = useSwipeReveal()
  const onBodyClick = (): void => {
    if (sw.justSwiped()) return                        /* 幽灵窗：滑完 450ms 内的合成 click 忽略 */
    if (sw.reveal) { sw.collapse(); return }           /* 已露出 → 点行身收回 */
    onOpen?.()
  }

  const meta = [time, duration ? `${duration} min` : null].filter(Boolean).join(' · ')

  return (
    <div
      className={[
        'tl-row',
        done ? 'tl-row--done' : '',
        urgent ? 'tl-row--urgent' : '',
        sw.reveal ? 'tl-row--reveal' : '',
      ].filter(Boolean).join(' ')}
      data-reveal={sw.reveal || undefined}
    >
      <div className="tl-row__del-slot" aria-hidden={!sw.reveal}>
        <button type="button" className="tl-row__del" tabIndex={sw.reveal ? 0 : -1} onClick={onDelete}>
          {deleteLabel}
        </button>
      </div>
      <div
        ref={sw.innerRef}
        className={`tl-row__inner ${sw.dragging ? 'tl-row__inner--drag' : ''}`.trim()}
        {...sw.handlers}
      >
        <button type="button" className="tl-row__body" onClick={onBodyClick}>
          <span className="tl-row__title t-small">{title}</span>
          {(meta || goal) && (
            <span className="tl-row__meta t-caption">
              {meta}
              {meta && goal ? ' · ' : ''}
              {goal}
            </span>
          )}
          {note && <span className="tl-row__note t-caption">{note}</span>}
        </button>
        <CompletionControl checked={!!done} onChange={() => onToggle?.()} label={checkLabel ?? title} />
      </div>
    </div>
  )
}
