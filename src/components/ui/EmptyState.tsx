import type { ReactNode } from 'react'
import './empty.css'

export interface EmptyStateProps {
  title: string
  sub?: string
  action?: ReactNode        /* 出口：空状态必须有下一步（spec §10） */
  illustration?: ReactNode   /* 可选插画；默认 Paper Mono "空白页面"线性图 */
}

/**
 * Paper Mono 风的默认插画：空白页面 + 三条内容线，提示"这里该有内容"。
 * 用 currentColor + stroke 描边，与全局 ink 色系一致；不用色块、不用通用插画库。
 */
function DefaultIllustration() {
  return (
    <svg viewBox="0 0 96 112" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="16" y="10" width="64" height="92" rx="6" />
      <line x1="28" y1="38" x2="68" y2="38" />
      <line x1="28" y1="54" x2="68" y2="54" />
      <line x1="28" y1="70" x2="54" y2="70" />
    </svg>
  )
}

/** 空状态：插画 + 一句主文案 + 一句副文案 + 可选动作。 */
export function EmptyState({ title, sub, action, illustration }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty__art" aria-hidden="true">
        {illustration ?? <DefaultIllustration />}
      </div>
      <p className="empty__title t-body">{title}</p>
      {sub && <p className="empty__sub t-caption">{sub}</p>}
      {action && <div className="empty__act">{action}</div>}
    </div>
  )
}
