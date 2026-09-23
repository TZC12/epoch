import { useEffect, useMemo, useRef, useState } from 'react'
import './thinking-states.css'

const HOLD = 2000 /* 一行状态停留 */
const SWAP = 150 /* 与 thinking-states.css --think-swap 同值 */
const GAP = 50 /* 新行晚于旧行出场的间隙 */

/** 新行：挂载带 is-enter-start（下方 8px+blur，无过渡），隔 GAP 后下一帧释放 = 落回进场。 */
function ThinkLine({ text }: { text: string }) {
  const [start, setStart] = useState(true)
  useEffect(() => {
    let raf = 0
    const timer = window.setTimeout(() => {
      raf = requestAnimationFrame(() => setStart(false))
    }, GAP)
    return () => { window.clearTimeout(timer); cancelAnimationFrame(raf) }
  }, [])
  return (
    <span className={`think__line ${start ? 'is-enter-start' : ''}`} data-text={text}>{text}</span>
  )
}

/**
 * Transitions.dev「Thinking states」机制（皮肤 Paper Mono）：单行状态文本按 hold 轮播。
 * shimmer 由 ::before（content: attr(data-text) + background-clip: text）在字形上扫过；
 * 换态 = 文本态三段交换：旧行 .is-exit 上浮淡出，新行自下方落回（--think-gap 错开）；
 * 隐藏 sizer 占住最长一行锁死盒宽——换态时盒子不跳尺寸，各行在同一盒内居中。
 * data-text 与 textContent 必须同步（shimmer 副本 = 可见行）。
 */
export function ThinkingStates({ states, className = '' }: { states: readonly string[]; className?: string }) {
  const [idx, setIdx] = useState(0)
  const [prev, setPrev] = useState<string | null>(null)
  const idxRef = useRef(0)
  const longest = useMemo(
    () => states.reduce((a, b) => (b.length > a.length ? b : a), ''),
    [states],
  )

  useEffect(() => {
    if (states.length < 2) return
    const id = window.setInterval(() => {
      const next = (idxRef.current + 1) % states.length
      setPrev(states[idxRef.current])
      idxRef.current = next
      setIdx(next)
    }, HOLD)
    return () => window.clearInterval(id)
  }, [states])

  useEffect(() => {
    if (prev == null) return
    const t = window.setTimeout(() => setPrev(null), SWAP + GAP + 20)
    return () => window.clearTimeout(t)
  }, [prev])

  const text = states[idx] ?? ''
  return (
    <span className={`think ${className}`} role="status">
      <span className="think__sizer" aria-hidden="true">{longest}</span>
      {prev != null && (
        <span className="think__line is-exit" data-text={prev} aria-hidden="true">{prev}</span>
      )}
      <ThinkLine key={text} text={text} />
    </span>
  )
}
