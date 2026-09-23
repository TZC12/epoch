import { BouncyAccordion, type BouncyAccordionItem } from '@/components/motion/bouncy-accordion'
import type { ReactNode } from 'react'

export interface AccordionItem {
  id: string
  title: ReactNode
  /** 触发器副标题（官方没有这个槽位，靠 title 是 ReactNode 组合出来）。 */
  sub?: ReactNode
  icon?: ReactNode
  /** 触发器右槽（计数、状态 Tag）。同上，走 title 组合。 */
  right?: ReactNode
  /** 展开内容；不传即为"动作行"——点一下走 onClick（官方 fork，见 bouncy-accordion.tsx）。 */
  content?: ReactNode
  onClick?: () => void
  disabled?: boolean
}

export interface AccordionProps {
  items: AccordionItem[]
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
  collapsible?: boolean
  className?: string
}

/**
 * Epoch 侧的薄适配层：真正的实现是官方 @beui/bouncy-accordion。
 * 官方 item 只有 {id,title,description,icon,disabled}，这里补三件它没覆盖的：
 *  1. 触发器副标题 / 右槽 —— 官方 title 是 ReactNode，组合出来即可，不必 fork；
 *  2. 面板正文被官方写成 muted 正文排版（text-[15px] text-muted-foreground），
 *     我们的面板里装的是列表和 Seg 控件，用 classNames.description 覆盖颜色；
 *  3. 动作行（点开即走、不展开）—— 这条必须 fork，见 bouncy-accordion.tsx 里的
 *     【本地改动】标记。
 */
export function Accordion({ items, ...rest }: AccordionProps) {
  const mapped: BouncyAccordionItem[] = items.map((it) => ({
    id: it.id,
    icon: it.icon,
    disabled: it.disabled,
    onClick: it.onClick,
    description: it.content,
    title: it.sub != null || it.right != null ? (
      <span className="flex w-full min-w-0 flex-1 items-center gap-3">
        <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="truncate">{it.title}</span>
          {it.sub != null && <span className="truncate text-caption font-normal text-subtle">{it.sub}</span>}
        </span>
        {it.right != null && <span className="shrink-0 text-caption font-normal text-subtle tabular-nums">{it.right}</span>}
      </span>
    ) : (
      it.title
    ),
  }))

  return (
    <BouncyAccordion
      {...rest}
      items={mapped}
      classNames={{
        /* 官方给 title 槽加了 truncate/nowrap 来放单行文本；我们塞进去的是两行 + 右槽，
           得先把这两条解开，否则副标题和计数会被裁掉 */
        title: 'w-full min-w-0 overflow-visible whitespace-normal',
        description: 'text-fg',
      }}
    />
  )
}
