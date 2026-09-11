import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pbar } from '@/components/ui/Pbar'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Row } from '@/components/ui/Row'
import { useToast } from '@/components/ui/Toast'
import { useCalendarStats, useGoalsWithPct, useWeekReview } from '@/services/queries'
import { useData } from '@/services/store'
import { AISuggestSheet } from '@/features/ai/AISuggestSheet'
import { captureInbox, saveReview } from '@/services/actions'
import { weekKey } from '@/lib/dates'
import { DotMatrix } from './DotMatrix'
import './progress.css'

/** 点阵一格的颜色语义（无假数据：没有记录就是没有记录）。 */
function dotClass(stat: { done: number; total: number; urgent: boolean } | null): string {
  if (!stat || stat.total === 0) return 'is-empty'
  if (stat.urgent && stat.done < stat.total) return 'is-urgent'
  if (stat.done === 0) return 'is-miss'
  if (stat.done >= stat.total) return 'is-full'
  return 'is-part'
}

/**
 * Progress（回顾层）：70 天证据点阵 → 目标真实 pct → 本周复盘（可回填）→ 反思入箱。
 * Evidence > vanity metrics：不做完成率大数字，只做证据。
 */
export default function ProgressPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const grid = useCalendarStats(70)
  const goals = useGoalsWithPct()
  const wk = weekKey(new Date())
  const saved = useWeekReview(wk)
  const reviewsMap = useData((s) => s.reviews)

  /* 回填：同周键再进不丢已有答案（legacy「覆盖丢失」修复） */
  const [wins, setWins] = useState(saved?.wins ?? '')
  const [drained, setDrained] = useState(saved?.drained ?? '')
  const [oneThing, setOneThing] = useState(saved?.oneThing ?? '')
  const [reviewKey, setReviewKey] = useState(wk)
  const [reflection, setReflection] = useState('')
  const [aiReviewOpen, setAiReviewOpen] = useState(false)

  // 周切换（跨周再进）时同步回填
  if (reviewKey !== wk) {
    setReviewKey(wk)
    setWins(saved?.wins ?? '')
    setDrained(saved?.drained ?? '')
    setOneThing(saved?.oneThing ?? '')
  }

  const history = Object.values(reviewsMap)
    .filter((r) => r.weekKey !== wk)
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey))
    .slice(0, 8)

  const onSaveReview = (): void => {
    if (!wins && !drained && !oneThing) return
    saveReview(wk, { wins: wins.trim(), drained: drained.trim(), oneThing: oneThing.trim() })
    toast(t('common.saved'), { tone: 'success' })
    if (oneThing.trim()) toast(t('progress.oneThingInbox'))
    setWins(''); setDrained(''); setOneThing('')
  }

  const onReflect = (): void => {
    const item = captureInbox(reflection, null, 'reflection')
    if (!item) return
    setReflection('')
    toast(t('progress.reflected'), { tone: 'success' })
  }

  return (
    <div>
      <header style={{ marginBottom: 'var(--sp-5)' }}>
        <h1 className="t-h1">{t('progress.title')}</h1>
        <p className="t-caption" style={{ marginTop: 'var(--sp-1)' }}>{t('progress.sub')}</p>
      </header>

      {/* 数据表（图五映射）：日/周/月点阵柱 */}
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <DotMatrix />
      </div>

      {/* 70 天证据点阵：历史=定格快照，今天=实时派生（不落缓存） */}
      <section aria-label={t('progress.calendar')} style={{ marginBottom: 'var(--sp-6)' }}>
        <h2 className="eyebrow sec-title">{t('progress.calendar')}</h2>
        <div className="dotgrid" role="img" aria-label={t('progress.calendar')}>
          {grid.map(({ key, stat }) => (
            <i key={key} className={`dotgrid__cell ${dotClass(stat)}`} title={key} />
          ))}
        </div>
        <div className="legend t-caption">
          <span><i className="dotgrid__cell is-full" /> {t('progress.legendDone')}</span>
          <span><i className="dotgrid__cell is-part" /> {t('progress.legendPart')}</span>
          <span><i className="dotgrid__cell is-miss" /> {t('progress.legendMiss')}</span>
          <span><i className="dotgrid__cell is-urgent" /> {t('progress.legendUrgent')}</span>
        </div>
      </section>

      {/* 目标（真实 pct 派生，非存储值） */}
      <section aria-label={t('progress.goals')} style={{ marginBottom: 'var(--sp-6)' }}>
        <h2 className="eyebrow sec-title">{t('progress.goals')}</h2>
        {goals.length === 0 ? (
          <EmptyState title={t('progress.noGoals')} />
        ) : (
          <div className="goal-list">
            {goals.map(({ goal, pct }) => (
              <div key={goal.id} className="goal-row">
                <Row title={goal.title} sub={goal.kicker ?? undefined} right={`${pct}%`} chevron onClick={() => navigate(`/goal/${goal.id}`)} />
                <Pbar pct={pct} done={pct >= 100} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 本周复盘：同周键回填（数据层已支持）、oneThing 入箱闭环 */}
      <section aria-label={t('progress.weekReview')} style={{ marginBottom: 'var(--sp-6)' }}>
        <div className="wr-head">
          <h2 className="eyebrow sec-title">{t('progress.weekReview')}</h2>
          <div className="wr-head__right">
            <button type="button" className="t-caption wr-ai" onClick={() => setAiReviewOpen(true)}>{t('ai.reviewTitle')}</button>
            <span className={`tag ${saved ? 'tag--accent' : ''}`}>{saved ? t('progress.weekReviewDone') : t('progress.weekReviewTodo')}</span>
          </div>
        </div>
        <div className="wr-form">
          <Field label={t('progress.qWins')} value={wins} onChange={(e) => setWins(e.target.value)} />
          <Field label={t('progress.qDrained')} value={drained} onChange={(e) => setDrained(e.target.value)} />
          <Field label={t('progress.qOneThing')} value={oneThing} onChange={(e) => setOneThing(e.target.value)} />
          <Button block onClick={onSaveReview}>{t('progress.saveAndClose')}</Button>
        </div>
      </section>

      {/* 反思 → 收集箱 */}
      <section aria-label={t('progress.reflection')} style={{ marginBottom: 'var(--sp-6)' }}>
        <h2 className="eyebrow sec-title">{t('progress.reflection')}</h2>
        <Field
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onReflect() }}
          placeholder={t('progress.reflectionPlaceholder')}
        />
      </section>

      {/* 复盘历史（往周只读） */}
      {history.length > 0 && (
        <section aria-label={t('progress.history')}>
          <h2 className="eyebrow sec-title">{t('progress.history')}</h2>
          <div>
            {history.map((r) => (
              <Row key={r.weekKey} title={r.oneThing || '—'} sub={r.weekKey} right={r.wins ? '✓' : undefined} />
            ))}
          </div>
        </section>
      )}

      <AISuggestSheet ability="review_observer" open={aiReviewOpen} onClose={() => setAiReviewOpen(false)} title={t('ai.reviewTitle')} />
    </div>
  )
}
