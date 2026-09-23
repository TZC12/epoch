import { useEffect, useRef, useState } from 'react'
import './completion-control.css'

export interface CompletionControlProps {
  checked: boolean
  onChange: () => void
  label: string          /* accessible name：完成「任务名」 */
}

/**
 * Trailing 完成控件（§六重构）：视觉小圆点 18px，命中区 44pt。
 * 勾选动画 = Transitions.dev 两条机制叠加：
 *  - Success check：false→true 瞬间，✓ 图标整体登场（fade + 80°→0 旋转 + blur→0 + 微 bob，500ms）；
 *  - Checkbox check：描边 stroke-dashoffset 绘制（350ms），--check-len 挂载时 getTotalLength 量出；
 * 取消 = 150ms 快速回抽，不播登场（避免列表初始渲染齐舞）。
 * role=checkbox（位置无关的可达性/测试锚点）。
 */
export function CompletionControl({ checked, onChange, label }: CompletionControlProps) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const prevChecked = useRef(checked)
  const [pop, setPop] = useState(false)

  useEffect(() => {
    const p = pathRef.current
    const b = btnRef.current
    if (!p || !b) return
    /* jsdom 无 getTotalLength——量不到就吃 CSS 默认值 15 */
    if (typeof p.getTotalLength !== 'function') return
    try {
      b.style.setProperty('--check-len', String(Math.ceil(p.getTotalLength()) + 1))
    } catch { /* 忽略：回退默认 */ }
  }, [])

  /* 只在"刚被勾上"时播登场：先清态 → 下一帧强制布局后重挂，动画可从 offset 0 重放 */
  useEffect(() => {
    const justChecked = checked && !prevChecked.current
    prevChecked.current = checked
    if (!justChecked) return
    setPop(false)
    const raf = requestAnimationFrame(() => setPop(true))
    return () => cancelAnimationFrame(raf)
  }, [checked])

  return (
    <button
      ref={btnRef}
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={`cc ${checked ? 'cc--on' : ''}`}
      onClick={(e) => { e.stopPropagation(); onChange() }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="cc__dot" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 10.1668 10.1668" fill="none" className={pop ? 'cc__pop' : ''}>
          <path
            ref={pathRef}
            d="M1 5.52L3.92 9.17L9.17 1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  )
}
