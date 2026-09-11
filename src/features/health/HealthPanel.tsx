import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Metric } from '@/components/ui/Metric'
import { Insight } from '@/components/ui/Insight'
import { Tag } from '@/components/ui/Chip'
import { Sheet } from '@/components/ui/Sheet'
import { useNavigate } from 'react-router-dom'
import { useData } from '@/services/store'
import { connectHealthDemo, disconnectHealth, energyOf } from '@/services/actions'
import './health-panel.css'

/**
 * 健康面板（Phase 4）：只读身体数据 → 回答「今天适合什么强度」。
 * 红线（spec §六之二）：不做健康 Dashboard、不打分、数据明示 Demo、断开必须确认。
 */
export default function HealthPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const health = useData((s) => s.health)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const close = () => navigate(-1)
  const energy = energyOf(health)
  const isDemo = health?.source === 'demo'

  return (
    <Panel open title={t('health.title')} onBack={close} backLabel={t('common.back')}>
      <div className="hp">
        {!health?.connected ? (
          <>
            <p className="t-body">{t('health.emptyBody')}</p>
            <p className="t-caption">{t('health.privacyNote')}</p>
            <Button block onClick={() => connectHealthDemo()}>{t('health.connectDemo')}</Button>
          </>
        ) : (
          <>
            <div className="hp__head">
              <span className="eyebrow">{t('health.todayLabel')}</span>
              {isDemo && <Tag tone="warning">{t('health.demoTag')}</Tag>}
            </div>
            <div className="hp__metrics">
              <Metric label={t('health.sleep')} value={health.today ? `${health.today.sleepHours.toFixed(1)}h` : '—'} sub={t('health.usual', { h: health.today?.usualSleep ?? 0 })} />
              <Metric label={t('health.rhr')} value={health.today?.restingHR ?? '—'} />
              <Metric label={t('health.hrv')} value={health.today?.hrv ?? '—'} />
              <Metric label={t('health.steps')} value={health.today?.steps ?? '—'} />
            </div>

            {energy === 'low' && (
              <Insight
                title={t('health.lowTitle')}
                body={t('health.lowBody', { a: health.today!.sleepHours.toFixed(1), b: (health.today!.usualSleep - health.today!.sleepHours).toFixed(1) })}
              />
            )}
            {energy === 'normal' && (
              <Insight tone="accent" title={t('health.okTitle')} body={t('health.okBody')} />
            )}

            <p className="t-caption">{t('health.privacyNote')}</p>
            <Button variant="danger-text" onClick={() => setConfirmOpen(true)}>{t('health.disconnect')}</Button>
          </>
        )}
      </div>

      {/* 断开确认（审计 C6：不再无声抹数据） */}
      <Sheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('health.disconnectTitle')}
        footer={
          <div className="gsheet-acts">
            <Button variant="quiet" onClick={() => setConfirmOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={() => { disconnectHealth(); setConfirmOpen(false) }}>{t('health.disconnectConfirm')}</Button>
          </div>
        }
      >
        <p className="t-body">{t('health.disconnectBody')}</p>
      </Sheet>
    </Panel>
  )
}
