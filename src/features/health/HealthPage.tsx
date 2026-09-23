import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Moon, Footprints, HeartPulse, Scale, BedDouble } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Stepper } from '@/components/ui/Stepper'
import { Sheet } from '@/components/ui/Sheet'
import { Insight } from '@/components/ui/Insight'
import { useToast } from '@/components/ui/Toast'
import { useHealthToday, useHealthWeek } from '@/services/queries'
import { saveHealthDay } from '@/services/actions'
import { isLowEnergy } from '@/lib/health-score'
import { todayKey, parseKey } from '@/lib/dates'
import type { HealthDay } from '@/services/types'
import '@/features/today/home.css'
import './health-page.css'

/** 手动记录 sheet：数值输入，保存写入 healthDays[今天] 并联动 legacy health。 */
function HealthDaySheet({ open, onClose, day }: { open: boolean; onClose: () => void; day: HealthDay | null }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [steps, setSteps] = useState('')
  const [sleep, setSleep] = useState('')
  const [deep, setDeep] = useState('')
  const [hr, setHr] = useState('')
  const [weight, setWeight] = useState('')
  useEffect(() => {
    if (!open) return
    setSteps(day ? String(day.steps || '') : '')
    setSleep(day ? String(day.sleepMin || '') : '')
    setDeep(day ? String(day.deepMin || '') : '')
    setHr(day ? String(day.restingHR || '') : '')
    setWeight(day ? String(day.weight || '') : '')
  }, [open, day])

  const onSave = (): void => {
    const d: HealthDay = {
      steps: Number(steps) || 0,
      sleepMin: Number(sleep) || 0,
      deepMin: Number(deep) || 0,
      restingHR: Number(hr) || 0,
      weight: Number(weight) || 0,
    }
    if (d.steps + d.sleepMin + d.deepMin + d.restingHR + d.weight === 0) return
    saveHealthDay(todayKey(), d)
    toast(t('common.saved'), { tone: 'success' })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('health.editTitle')}
      footer={
        <div className="health-sheet__acts">
          <Button variant="quiet" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={onSave}>{t('common.save')}</Button>
        </div>
      }
    >
      <div className="health-form">
        <Stepper label={t('health.steps')} value={steps} onChange={setSteps} min={0} max={60000} step={500} fallback={5000} unit={t('health.unitSteps')} />
        <Stepper label={t('health.sleep')} value={sleep} onChange={setSleep} min={0} max={1440} step={15} fallback={420} unit={t('health.unitMin')} />
        <Stepper label={t('health.deep')} value={deep} onChange={setDeep} min={0} max={1440} step={10} fallback={90} unit={t('health.unitMin')} />
        <Stepper label={t('health.rhr')} value={hr} onChange={setHr} min={30} max={200} step={1} fallback={62} unit={t('health.unitHr')} />
        <Stepper label={t('health.weight')} value={weight} onChange={setWeight} min={30} max={250} step={0.1} decimals={1} fallback={60} unit={t('health.unitKg')} />
      </div>
    </Sheet>
  )
}

const GRADE_KEY = { ex: 'gradeEx', good: 'gradeGood', fair: 'gradeFair', poor: 'gradePoor' } as const

/**
 * HealthPage（概念稿 page6：身体状态）：得分卡 + 指标 2×2 + 近 7 天步数柱 + 手动记录表单。
 * 数据源为手动记录（healthDays）；保存同时刷新 legacy health，Plan/AI 能量语义不断链。
 */
export default function HealthPage() {
  const { t } = useTranslation()
  const { day, score, grade } = useHealthToday()
  const week = useHealthWeek()
  const [sheetOpen, setSheetOpen] = useState(false)
  const maxSteps = Math.max(10000, ...week.series.map((x) => x.steps ?? 0))
  const now = new Date()

  const sleepH = day && day.sleepMin > 0 ? (day.sleepMin / 60).toFixed(1) : '—'
  const deepM = day && day.deepMin > 0 ? day.deepMin : null
  const delta = day && day.weight > 0 && week.prevWeight && week.prevWeight > 0
    ? Math.round((day.weight - week.prevWeight) * 10) / 10
    : null

  const stats = [
    { Icon: Footprints, label: t('health.steps'), value: day && day.steps > 0 ? day.steps.toLocaleString() : '—' },
    { Icon: Moon, label: t('health.sleep'), value: sleepH === '—' ? '—' : `${sleepH}${t('health.hrs')}` },
    { Icon: BedDouble, label: t('health.deep'), value: deepM ? `${deepM} min` : '—' },
    { Icon: HeartPulse, label: t('health.rhr'), value: day && day.restingHR > 0 ? `${day.restingHR} ${t('health.unitHr')}` : '—' },
  ]

  return (
    <div className="health">
      <header className="home-head">
        <div className="home-head__col">
          <span className="eyebrow">{t('health.eyebrow')} · {now.getMonth() + 1}/{now.getDate()}</span>
          <h1 className="t-h1">{t('health.title')}</h1>
        </div>
        <Button size="sm" variant="quiet" onClick={() => setSheetOpen(true)}>{t('health.record')}</Button>
      </header>

      <section className="health-score" aria-label={t('health.scoreLabel')}>
        <span className="eyebrow">{t('health.scoreLabel')}</span>
        <div className="health-score__num tnum">{day ? score : '—'}</div>
        <p className="t-small health-score__grade">{day ? t(`health.${GRADE_KEY[grade]}`) : t('health.noData')}</p>
      </section>

      {isLowEnergy(day) && <Insight title={t('health.lowEnergy')} />}

      <section className="health-stats" aria-label={t('health.todayLabel')}>
        {stats.map((s) => (
          <div key={s.label} className="health-stat">
            <s.Icon size={16} aria-hidden="true" />
            <span className="health-stat__label t-caption">{s.label}</span>
            <span className="health-stat__value tnum">{s.value}</span>
          </div>
        ))}
        {day && day.weight > 0 && (
          <div className="health-stat health-stat--wide">
            <Scale size={16} aria-hidden="true" />
            <span className="health-stat__label t-caption">{t('health.weight')}</span>
            <span className="health-stat__value tnum">
              {day.weight} {t('health.unitKg')}
              {delta !== null && delta !== 0 && <em className="health-stat__delta">{t('health.delta', { delta: delta > 0 ? `+${delta}` : delta })}</em>}
            </span>
          </div>
        )}
      </section>

      <section className="health-week" aria-label={t('health.weekSteps')}>
        <div className="health-week__head">
          <h2 className="eyebrow">{t('health.weekSteps')}</h2>
          <span className="t-caption tnum">{t('health.avg', { n: week.avg.toLocaleString() })}</span>
        </div>
        <div className="health-bars">
          {week.series.map((d) => (
            <span key={d.date} className="health-bars__col" title={`${parseKey(d.date).getDate()} · ${d.steps ?? '—'}`}>
              <i style={{ height: `${d.steps ? Math.max(4, Math.min(100, (d.steps / maxSteps) * 100)) : 4}%` }} className={d.steps && d.steps >= 10000 ? 'on' : ''} />
              <b className="t-caption">{parseKey(d.date).getDate()}</b>
            </span>
          ))}
        </div>
        <p className="t-caption health-goal">{t('health.goalSteps')}</p>
      </section>

      <HealthDaySheet open={sheetOpen} onClose={() => setSheetOpen(false)} day={day} />
    </div>
  )
}
