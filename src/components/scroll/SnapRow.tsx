import { useEffect, useRef, type ReactNode } from 'react'
import './snap-row.css'

/* ═══════════════════════════════════════════════════════════════════
   SnapRow · 单行横向滚动 + 吸附（今天页习惯条、学习页语言 chips）
   ───────────────────────────────────────────────────────────────────
   为什么是它俩：这两处原本是 flex-wrap，项目一多就长成两三行，
   把首屏的动作区往下推——dense-no-scroll-layout 的"Go horizontal"
   正是为这种情况准备的：横向一行放得下、纵向不再吃高度。

   实现选择：纯 CSS scroll-snap（原生惯性、原生触摸方向判定、零 JS 帧），
   不引滚动动画库。JS 只做一件 CSS 做不到的事——判断"到底/到左"以决定
   两端渐隐要不要出现（没溢出时不该有渐隐，否则像坏了）。
   这个监听是每行一个、passive、属性只在布尔值真的翻转时写一次。
   ═══════════════════════════════════════════════════════════════════ */

export interface SnapRowProps {
  children: ReactNode
  className?: string
  /** 读屏名：横向滚动区必须给，否则读屏用户不知道这块还能往右走 */
  ariaLabel: string
}

export function SnapRow({ children, className = '', ariaLabel }: SnapRowProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const sync = (): void => {
      const max = el.scrollWidth - el.clientWidth
      /* 溢出不足 8px 视为"放得下"：不给一个看不见的方向加渐隐 */
      const overflow = max > 8
      const atStart = !overflow || el.scrollLeft <= 2
      const atEnd = !overflow || el.scrollLeft >= max - 2
      if (el.dataset.overflow !== (overflow ? '1' : '0')) el.dataset.overflow = overflow ? '1' : '0'
      if (el.dataset.atStart !== (atStart ? '1' : '0')) el.dataset.atStart = atStart ? '1' : '0'
      if (el.dataset.atEnd !== (atEnd ? '1' : '0')) el.dataset.atEnd = atEnd ? '1' : '0'
    }
    sync()
    el.addEventListener('scroll', sync, { passive: true })
    /* 内容增减（加语言/加习惯）与窗口缩放都会改变溢出量，要重算 */
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null
    ro?.observe(el)
    return () => { el.removeEventListener('scroll', sync); ro?.disconnect() }
  }, [])

  return (
    /* 不给容器加 tabIndex：行里每一项本来就是可聚焦按钮，键盘 Tab 到屏外的项时浏览器会
       自动把它滚进视口；现代浏览器本身也把"可滚动区域"列为可聚焦。再加一层 tabindex
       只是让键盘用户多按一次空停靠点（jsx-a11y 也是这么判的）。
       role=group + aria-label 保留：读屏要能报出"这块还能往右走"。 */
    <div
      ref={ref}
      className={`snap-row no-scrollbar ${className}`.trim()}
      role="group"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  )
}
