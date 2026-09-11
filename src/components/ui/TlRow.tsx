import { Checkbox } from './Checkbox'
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

/** 时间轴行（hero 行）：完成勾选 + 左滑露删除。手势规则见 useSwipeReveal。 */
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
        <Checkbox checked={!!done} onChange={() => onToggle?.()} label={checkLabel ?? title} />
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
      </div>
    </div>
  )
}
