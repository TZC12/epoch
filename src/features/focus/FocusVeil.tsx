import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useFocus } from './focusStore'
import './focus.css'

const fmt = (s: number): string => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/**
 * Focus 全屏（spec：任务名/倒计时/Start，无装饰）。
 * 退出不清进度：toast「回去继续」恢复（legacy P4 语义）。
 */
export function FocusVeil() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { taskId, title, seconds, running, finished, toggle, tick, quit, resume } = useFocus()

  useEffect(() => {
    if (!running) return
    const iv = window.setInterval(tick, 1000)
    return () => window.clearInterval(iv)
  }, [running, tick])

  if (taskId == null) return null

  const onQuit = (): void => {
    quit()
    toast(t('focus.quitToast'), { action: { label: t('focus.resume'), onClick: resume } })
  }

  return createPortal(
    <div className="focus-veil" role="dialog" aria-modal="true" aria-label={title}>
      <p className="focus-veil__task t-h3">{title}</p>
      <div className={`focus-veil__time t-display tnum ${finished ? 'is-done' : ''}`}>{finished ? t('focus.done') : fmt(seconds)}</div>
      <Button onClick={toggle} disabled={finished}>{running ? t('focus.pause') : t('focus.start')}</Button>
      <button type="button" className="focus-veil__quit t-small" onClick={onQuit}>{t('focus.quit')}</button>
    </div>,
    document.body,
  )
}
