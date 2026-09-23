import { useState } from 'react'
import { CompletionControl } from './CompletionControl'
import { Toggle } from './Toggle'
import { justSwiped, markSwipeEnd, usePagerYield } from './swipe'
import { SwipeableList, type SwipeableListItem, type SwipeableListValue } from '@/components/motion/swipeable-list'
import { cn } from '@/lib/utils'
import './tl-row.css'

export type TaskTier = 'main' | 'block' | 'anytime'

export interface TlRowProps {
  /** 稳定标识（调用方传 task.id）：删掉正露出的那行时，露出态不会串到下一行。 */
  id?: string
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
  toggleKind?: 'check' | 'switch'   /* check=今日完成（绿✓）；switch=计划设定启用/停用 */
  onToggle?: () => void
  onOpen?: () => void
  onDelete?: () => void
}

/** 露出宽度（旧 REVEAL_W 同值）：一颗文字动作。 */
const ACTION_W = 64
/**
 * 真机校准的开门门槛。官方阈值 = max(revealThreshold, 动作宽 × 0.46)，
 * 对 64px 只算出 29px，会把校准过的 40px 调回 twitchy 档；
 * 所以门槛用官方自带的 revealThreshold 下限表达，不改官方常量。
 * 收回侧不受影响：0.72 × 64 = 46px，与旧版一致（迟滞方向也就保住了）。
 */
const REVEAL_AT = 40

/**
 * 任务行列表（hero 行，§六重构）：标题=Primary 左，完成=Trailing 右；
 * toggleKind=check：CompletionControl（○→✓ 描边+登场）；
 * toggleKind=switch：Toggle 开关——日程规划里的行是"设定"不是"清单"，
 *   done 语义换成 on/off，停用行淡出（无删除线，删除线=已完成专属语义）。
 * 左滑露删除：引擎是 @beui/swipeable-list 官方实现，本文件只做映射。
 *
 * ⚠ "同时只开一行"是官方挂在**列表**上的状态，协调因此必须是列表级：把每行各自
 *   包成一个单行列表去用，"起手即收回上一行"就丢了。
 *   另外两条真机规则（幽灵窗 / pager 让位）在 ./swipe.ts。
 */
export function TlRowList({ rows }: { rows: TlRowProps[] }) {
  const [open, setOpen] = useState<SwipeableListValue | null>(null)
  const pagerYield = usePagerYield()

  const items: SwipeableListItem[] = rows.map((row, i) => {
    const id = row.id ?? `row-${i}`
    const revealed = open?.id === id
    const meta = [row.time, row.duration ? `${row.duration} min` : null].filter(Boolean).join(' · ')
    const trailingLabel = row.checkLabel ?? row.title

    return {
      id,
      content: (
        <div
          className={cn(
            /* 状态类挂在这层内容上（官方的 item 层只吃一份静态 className，没法逐行给）；
               "整张行面淡出"由 .tl-row__inner:has(.tl-row--done) 反向命中，见 tl-row.css */
            'tl-row__state flex min-w-0 flex-1 items-center',
            row.toggleKind === 'switch'
              ? (!row.done && 'tl-row--off')
              : (row.done && 'tl-row--done'),
            row.urgent && 'tl-row--urgent',
          )}
        >
          <button
            type="button"
            className="tl-row__body"
            onClick={() => {
              if (justSwiped()) return                  /* 幽灵窗：滑完 450ms 内的合成 click 忽略 */
              if (document.body.dataset.pagerGhost) {   /* 长按翻卡后的合成 click */
                delete document.body.dataset.pagerGhost
                return
              }
              /* 已露出 → 点行身收回（动画由官方引擎跑） */
              if (revealed) { setOpen(null); return }
              row.onOpen?.()
            }}
          >
            <span className="tl-row__title t-small">{row.title}</span>
            {(meta || row.goal) && (
              <span className="tl-row__meta t-caption">
                {meta}
                {meta && row.goal ? ' · ' : ''}
                {row.goal}
              </span>
            )}
            {row.note && <span className="tl-row__note t-caption">{row.note}</span>}
          </button>
          {row.toggleKind === 'switch'
            ? <Toggle checked={!!row.done} onChange={() => row.onToggle?.()} label={trailingLabel} />
            : <CompletionControl checked={!!row.done} onChange={() => row.onToggle?.()} label={trailingLabel} />}
        </div>
      ),
      rightActions: [{
        id: 'delete',
        label: row.deleteLabel ?? '删除',
        tone: 'danger',
        onClick: () => row.onDelete?.(),
      }],
    }
  })

  return (
    <SwipeableList
      items={items}
      value={open}
      onValueChange={(v) => { markSwipeEnd(); setOpen(v) }}
      /* pager 长按武装期整列让位给翻卡 */
      dragEnabled={!pagerYield}
      actionWidth={ACTION_W}
      revealThreshold={REVEAL_AT}
      classNames={{
        /* item 层保留 .tl-row 这个名字（页面 CSS 与测试拿它当"整行"）。
           官方给行卡底色（bg-muted）与投影、描边：我们是列表内平铺行，三者都不要；
           button 的边框/底色由 .tl-row__del（未分层）负责。 */
        item: 'tl-row bg-transparent',
        action: 'tl-row__del',
        surface: 'tl-row__inner flex items-center min-h-0 border-0 shadow-none p-1 pr-2 pl-3',
      }}
    />
  )
}

/** 单行便捷入口（样式页 / 测试用）；多行请直接用 TlRowList，否则失去"只开一行"协调。 */
export function TlRow(row: TlRowProps) {
  return <TlRowList rows={[row]} />
}
