import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Chip } from '@/components/ui/Chip'
import { useData } from '@/services/store'
import { updateDirection, uid } from '@/services/actions'
import './onboarding.css'

/**
 * Onboarding（首次引导，7 步语义 → 6 步实现；健康步待 Phase 4 健康模块定案）：
 * welcome → schedule(作息真落库) → routines(勾选真落库) → direction(真落库) → goals(真落库) → done。
 * 原则：用户第一次进入 App 必须很快得到一个可工作的 Today；写不出 Goal 可跳过。
 * 每步落库（legacy「输入丢弃」是审计 P0 级交互谎言，此版杜绝）。
 */
const PRESET_ROUTINES = [
  { key: 'morning', zh: '晨间例行', en: 'Morning routine', time: '07:00', durMin: 15 },
  { key: 'exercise', zh: '运动 30 分钟', en: 'Exercise 30 min', time: '18:00', durMin: 30 },
  { key: 'reading', zh: '阅读 20 分钟', en: 'Reading 20 min', time: '22:00', durMin: 20 },
  { key: 'journal', zh: '写日志', en: 'Journal', time: '22:30', durMin: 10 },
]

const DOMAINS = ['Health', 'Work', 'Learning', 'Family', 'Finance', 'Craft']

export const OB_KEY = 'epoch-ob-done'

export function needOnboarding(): boolean {
  try { return localStorage.getItem(OB_KEY) !== '1' } catch { return false }
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { t, i18n } = useTranslation()
  const zh = i18n.language.startsWith('zh')
  const [step, setStep] = useState(0)
  const [wake, setWake] = useState('07:00')
  const [sleep, setSleep] = useState('23:30')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [statement, setStatement] = useState('')
  const [domains, setDomains] = useState<Set<string>>(new Set())
  const [goalTitle, setGoalTitle] = useState('')

  const finish = (): void => {
    updateDirection({
      wake,
      sleep,
      statement: statement.trim(),
      domains: [...domains],
    })
    const state = useData.getState()
    const newRoutines = PRESET_ROUTINES
      .filter((r) => picked.has(r.key))
      .map((r) => ({
        id: uid(), goalId: null, name: zh ? r.zh : r.en, sub: null,
        frequency: null, time: r.time, durMin: r.durMin, kind: 'habit' as const,
        archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }))
    useData.setState({
      routines: [...state.routines, ...newRoutines],
      goals: goalTitle.trim()
        ? [...state.goals, {
            id: uid(), title: goalTitle.trim(), kicker: 'Quarter', note: null, focus: null, next: null,
            ladder: [], status: 'active' as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          }]
        : state.goals,
    })
    try { localStorage.setItem(OB_KEY, '1') } catch { /* ignore */ }
    onDone()
  }

  const steps = [
    // 0 welcome
    {
      title: t('ob.welcomeTitle'),
      body: (
        <div className="ob-body">
          <p className="t-h3 ob-brand">Epoch</p>
          <p className="t-body">{t('ob.welcomeBody')}</p>
          <p className="t-caption">{t('ob.welcomeTag')}</p>
        </div>
      ),
      cta: t('ob.next'),
      onCta: () => setStep(1),
      skippable: false,
    },
    // 1 schedule
    {
      title: t('ob.scheduleTitle'),
      body: (
        <div className="ob-body ob-form">
          <Field label={t('me.wake')} value={wake} onChange={(e) => setWake(e.target.value)} inputMode="numeric" />
          <Field label={t('me.sleep')} value={sleep} onChange={(e) => setSleep(e.target.value)} inputMode="numeric" />
        </div>
      ),
      cta: t('ob.next'),
      onCta: () => setStep(2),
      skippable: false,
    },
    // 2 routines
    {
      title: t('ob.routinesTitle'),
      body: (
        <div className="ob-body">
          <div className="ob-chips">
            {PRESET_ROUTINES.map((r) => (
              <Chip key={r.key} on={picked.has(r.key)} onClick={() => setPicked((p) => { const n = new Set(p); if (n.has(r.key)) n.delete(r.key); else n.add(r.key); return n })}>
                {zh ? r.zh : r.en}
              </Chip>
            ))}
          </div>
          <p className="t-caption">{t('ob.routinesHint')}</p>
        </div>
      ),
      cta: t('ob.next'),
      onCta: () => setStep(3),
      skippable: true,
      skipLabel: t('ob.skipStep'),
    },
    // 3 direction
    {
      title: t('ob.directionTitle'),
      body: (
        <div className="ob-body ob-form">
          <Field label={t('me.directionLabel')} value={statement} onChange={(e) => setStatement(e.target.value)} placeholder={t('me.directionPlaceholder')} />
          <div className="ob-chips">
            {DOMAINS.map((d) => (
              <Chip key={d} on={domains.has(d)} onClick={() => setDomains((p) => { const n = new Set(p); if (n.has(d)) n.delete(d); else n.add(d); return n })}>{d}</Chip>
            ))}
          </div>
        </div>
      ),
      cta: t('ob.next'),
      onCta: () => setStep(4),
      skippable: true,
      skipLabel: t('ob.skipStep'),
    },
    // 4 goals
    {
      title: t('ob.goalsTitle'),
      body: (
        <div className="ob-body ob-form">
          <Field label={t('ob.goalLabel')} value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder={t('ob.goalPlaceholder')} />
          <p className="t-caption">{t('ob.goalsHint')}</p>
        </div>
      ),
      cta: t('ob.doneCta'),
      onCta: finish,
      skippable: true,
      skipLabel: t('ob.skipStep'),
    },
  ]

  const cur = steps[step]
  const progress = Math.round(((step + 1) / steps.length) * 100)

  return (
    <div className="ob" role="dialog" aria-modal="true" aria-label={cur.title}>
      <div className="ob__progress" aria-hidden="true">
        <div className="ob__bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="ob__content">
        <h1 className="t-h2">{cur.title}</h1>
        {cur.body}
      </div>
      <div className="ob__acts">
        {cur.skippable && cur.skipLabel && (
          <Button variant="ghost" onClick={() => (step === steps.length - 1 ? finish() : setStep(step + 1))}>{cur.skipLabel}</Button>
        )}
        <Button block onClick={cur.onCta}>{cur.cta}</Button>
      </div>
    </div>
  )
}
