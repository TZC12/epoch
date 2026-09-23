import { useEffect, useRef, useState } from 'react'

/**
 * 字段错误 + 抖动：fire(msg) 同时点亮 error 文案并重启 shake；
 * holdMs 后文案自动淡回中性（对应 transitions.dev 的 revert-hold）。
 */
export function useFieldErr(holdMs = 3000) {
  const [err, setErr] = useState<string | null>(null)
  const [shakeKey, setShakeKey] = useState(0)
  const timer = useRef(0)
  const fire = (msg: string): void => {
    setErr(msg)
    setShakeKey((k) => k + 1)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setErr(null), holdMs)
  }
  const clear = (): void => { setErr(null); window.clearTimeout(timer.current) }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return { err, shakeKey, fire, clear }
}
