import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Row } from '@/components/ui/Row'
import { Pbar } from '@/components/ui/Pbar'
import { Sheet } from '@/components/ui/Sheet'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Seg } from '@/components/ui/Seg'
import { Tag } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { Pencil, Plus } from 'lucide-react'
import { GoalSheet } from '@/features/goals/GoalSheet'
import { RoutineSheet } from '@/features/habits/RoutineSheet'
import { useToast } from '@/components/ui/Toast'
import { useDirection, useGoalsWithPct } from '@/services/queries'
import { useData, completedAllTime } from '@/services/store'
import { updateDirection } from '@/services/actions'
import { Target, Repeat, HeartPulse, Settings2, LogOut } from 'lucide-react'
import { dateKey, todayKey } from '@/lib/dates'
import { useTheme } from '@/lib/theme'
import { setLang } from '@/lib/i18n'
import { hasBackend, supabase } from '@/lib/supabase'
import type { Goal, Routine } from '@/services/types'
import './me.css'

/**
 * Me（身份层）：Direction 卡（可编辑——消灭旧版死端）→ 目标（真实 pct）→ 例程与习惯 → 系统。
 * Identity Layer，不是 Account 页。
 */
export default function MePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const direction = useDirection()
  const goals = useGoalsWithPct()
  const routines = useData((s) => s.routines)
  const tasksAll = useData((s) => s.tasks)
  const inboxAll = useData((s) => s.inbox)

  /* 图六三指标（全部真实派生，无假数据）；累计 = completedAllTime（与数据表同一聚合函数，口径唯一） */
  const totalDone = completedAllTime(useData((s) => s.dayStats), tasksAll, todayKey())
  const doneToday = tasksAll.filter((x) => x.completedAt != null && dateKey(new Date(x.completedAt)) === todayKey()).length
  const inboxCount = inboxAll.filter((i) => i.status === 'open').length
  const routineCount = routines.filter((r) => !r.archived).length

  const [dirOpen, setDirOpen] = useState(false)
  const [statement, setStatement] = useState(direction.statement)
  const [domains, setDomains] = useState(direction.domains.join(', '))
  const [goalSheet, setGoalSheet] = useState<Goal | 'new' | null>(null)
  const [routineSheet, setRoutineSheet] = useState<Routine | 'new' | null>(null)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [routinesOpen, setRoutinesOpen] = useState(false)

  const theme = useTheme()
  const lang = (document.documentElement.lang || 'zh-CN').startsWith('zh') ? 'zh' : 'en'

  const openDir = (): void => {
    setStatement(direction.statement)
    setDomains(direction.domains.join(', '))
    setDirOpen(true)
  }

  const saveDir = (): void => {
    updateDirection({
      statement: statement.trim(),
      domains: domains.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
    })
    setDirOpen(false)
    toast(t('common.saved'), { tone: 'success' })
  }

  const signOut = async (): Promise<void> => {
    if (!supabase) return
    await supabase.auth.signOut()
    toast(t('me.signedOut'))
  }

  return (
    <div>
      {/* 图六映射：头像 + 三个真实指标 + 白卡分组 */}
      <header className="me-head">
        <div className="me-head__avatar" aria-hidden="true">{(direction.statement.trim()[0] ?? 'E').toUpperCase()}</div>
        <div className="me-head__metrics">
          <div className="me-head__metric">
            <span className="tnum t-h3">{totalDone}</span>
            <span className="t-caption">{t('me.mTotalDone')}</span>
          </div>
          <div className="me-head__metric">
            <span className="tnum t-h3">{doneToday}</span>
            <span className="t-caption">{t('me.mDoneToday')}</span>
          </div>
          <div className="me-head__metric">
            <span className="tnum t-h3">{inboxCount}</span>
            <span className="t-caption">{t('me.mInbox')}</span>
          </div>
        </div>
      </header>

      {/* Direction 卡：一句话锚点（可点编辑） */}
      <Card onClick={openDir} className="dir-card">
        <div className="dir-card__head">
          <span className="eyebrow">{t('me.directionLabel')}</span>
          <IconButton size="sm" icon={<Pencil size={14} strokeWidth={1.8} aria-hidden="true" />} label={t('me.editDirection')} onClick={openDir} />
        </div>
        {direction.statement ? (
          <p className="dir-card__statement t-h3">{direction.statement}</p>
        ) : (
          <p className="dir-card__statement t-body">{t('me.noDirection')}</p>
        )}
        {direction.domains.length > 0 && (
          <div className="dir-card__domains">
            {direction.domains.map((d) => <Tag key={d}>{d}</Tag>)}
          </div>
        )}
      </Card>

      {/* 记录组（白卡行，图六 Profile & account 形态） */}
      <section aria-label={t('me.goalsLabel')} style={{ marginTop: 'var(--sp-5)' }}>
        <h2 className="eyebrow sec-title">{t('me.groupRecords')}</h2>
        <div className="me-group">
          <Row title={t('me.goalsLabel')} sub={`${goals.length}`} chevron onClick={() => setGoalsOpen((v) => !v)} rightIcon={<Target size={18} strokeWidth={1.7} aria-hidden="true" />} />
          {goalsOpen && (
            <div className="me-group__panel">
              <IconButton size="sm" icon={<Plus size={16} strokeWidth={1.8} aria-hidden="true" />} label={t('goal.newTitle')} onClick={() => setGoalSheet('new' as const)} />
              {goals.length === 0 ? (
                <EmptyState title={t('me.noDirection')} />
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
            </div>
          )}
          <Row title={t('me.routinesLabel')} sub={`${routineCount}`} chevron onClick={() => setRoutinesOpen((v) => !v)} rightIcon={<Repeat size={18} strokeWidth={1.7} aria-hidden="true" />} />
          {routinesOpen && (
            <div className="me-group__panel">
              <IconButton size="sm" icon={<Plus size={16} strokeWidth={1.8} aria-hidden="true" />} label={t('routine.newTitle')} onClick={() => setRoutineSheet('new' as const)} />
              {routines.length === 0 ? (
                <EmptyState title={t('me.noRoutines')} />
              ) : (
                <div>
                  {routines.map((r) => (
                    <Row
                      key={r.id}
                      title={r.name}
                      sub={[r.time, r.sub, r.kind === 'habit' ? t('me.habit') : t('me.routine')].filter(Boolean).join(' · ')}
                      chevron
                      onClick={() => setRoutineSheet(r)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          <Row title={t('health.title')} sub={t('health.entrySub')} chevron onClick={() => navigate('/health')} rightIcon={<HeartPulse size={18} strokeWidth={1.7} aria-hidden="true" />} />
        </div>
      </section>

      {/* 系统组（白卡分组，图六 Preferences 形态） */}
      <section aria-label={t('me.systemLabel')} style={{ marginTop: 'var(--sp-5)' }}>
        <h2 className="eyebrow sec-title">{t('me.systemLabel')}</h2>
        <div className="me-group">
          <div className="pref">
            <span className="pref__label t-small"><Settings2 size={18} strokeWidth={1.7} aria-hidden="true" /> {t('settings.theme')}</span>
            <Seg
              options={[
                { value: 'system', label: t('settings.themeSystem') },
                { value: 'light', label: t('settings.themeLight') },
                { value: 'dark', label: t('settings.themeDark') },
              ]}
              value={theme.mode}
              onChange={(v) => theme.setMode(v)}
              ariaLabel={t('settings.theme')}
            />
          </div>
          <div className="pref">
            <span className="pref__label t-small">{t('settings.language')}</span>
            <Seg
              options={[
                { value: 'zh', label: t('settings.langZh') },
                { value: 'en', label: t('settings.langEn') },
              ]}
              value={lang}
              onChange={(v) => setLang(v)}
              ariaLabel={t('settings.language')}
            />
          </div>
          {hasBackend && (
            <Row
              title={t('me.signOut')}
              chevron
              onClick={() => void signOut()}
              rightIcon={<LogOut size={18} strokeWidth={1.7} aria-hidden="true" />}
            />
          )}
        </div>
      </section>

      {/* Direction 编辑 sheet（Understand→Edit→Save；本页数据 1:1 落 state.direction） */}
      <Sheet
        open={dirOpen}
        onClose={() => setDirOpen(false)}
        title={t('me.editDirection')}
        footer={
          <div className="me-acts">
            <Button variant="quiet" onClick={() => setDirOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={saveDir}>{t('common.save')}</Button>
          </div>
        }
      >
        <div className="me-dir-form">
          <Field label={t('me.directionLabel')} value={statement} onChange={(e) => setStatement(e.target.value)} placeholder={t('me.directionPlaceholder')} />
          <Field label={t('me.domainsLabel')} value={domains} onChange={(e) => setDomains(e.target.value)} />
        </div>
      </Sheet>

      <GoalSheet target={goalSheet} onClose={() => setGoalSheet(null)} />
      <RoutineSheet target={routineSheet} onClose={() => setRoutineSheet(null)} />
    </div>
  )
}
