import { useState, useEffect, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Row } from '@/components/ui/Row'
import { Accordion } from '@/components/ui/Accordion'
import { Pbar } from '@/components/ui/Pbar'
import { Sheet } from '@/components/ui/Sheet'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Seg } from '@/components/ui/Seg'
import { Tag, Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { Pencil, Plus, Sparkles } from 'lucide-react'
import { GoalSheet } from '@/features/goals/GoalSheet'
import { RoutineSheet } from '@/features/habits/RoutineSheet'
import { useToast } from '@/components/ui/Toast'
import { useDirection, useGoalsWithPct } from '@/services/queries'
import { useData, completedAllTime } from '@/services/store'
import { updateDirection, setAIConfig, setProfile, NICKNAME_MAX } from '@/services/actions'
import { fileToAvatar } from '@/lib/avatar'
import { chatCompletion, isConfigured, normalizeBaseUrl } from '@/lib/ai-provider'
import { useFieldErr } from '@/lib/useFieldErr'
import { useAuth, signOut as authSignOut, displayAccount, isLocalMode } from '@/lib/auth'
import { Target, Repeat, HeartPulse, Settings2, LogOut, User, Info } from 'lucide-react'
import { readBuildInfo, formatBuildTime, buildInfoLine } from '@/lib/build-info'
import { dateKey, todayKey } from '@/lib/dates'
import { useTheme } from '@/lib/theme'
import { setLang } from '@/lib/i18n'
import { hasBackend } from '@/lib/supabase'
import type { Goal, Routine } from '@/services/types'
import './me.css'

/** 国内可直连的 OpenAI 兼容预设（均为各家官方兼容端点）。 */
const AI_PRESETS = [
  { name: 'GLM · 智谱', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { name: 'Kimi · 月之暗面', baseUrl: 'https://api.moonshot.cn/v1', model: 'kimi-latest' },
]

/* 设计偏好：选项表只此一份，Seg 与折叠行的摘要共用（口径唯一，改一处两处同步） */
const THEME_OPTS = [
  { value: 'system', label: 'settings.themeSystem' },
  { value: 'light', label: 'settings.themeLight' },
  { value: 'dark', label: 'settings.themeDark' },
] as const
const PALETTE_OPTS = [
  { value: 'mono', label: 'settings.paletteMono' },
  { value: 'warm', label: 'settings.paletteWarm' },
] as const
const LANG_OPTS = [
  { value: 'zh', label: 'settings.langZh' },
  { value: 'en', label: 'settings.langEn' },
] as const
const BG_OPTS = [
  { value: 'tech', label: 'settings.bgTech' },
  { value: 'matrix', label: 'settings.bgMatrix' },
] as const

type Translate = (key: string) => string
const pickLabel = <T extends string>(opts: readonly { value: T; label: string }[], value: T, t: Translate): string =>
  t(opts.find((o) => o.value === value)?.label ?? '')

/** 偏好行：标签在左、分段控制在右（手风琴面板内的标准一行）。opts 里的 label 是 i18n key。 */
function SegRow<T extends string>({ label, opts, value, onChange }: { label: string; opts: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { t } = useTranslation()
  return (
    <div className="pref">
      <span className="pref__label t-small">{label}</span>
      <Seg options={opts.map((o) => ({ value: o.value, label: t(o.label) }))} value={value} onChange={onChange} ariaLabel={label} />
    </div>
  )
}

/** AI 接口设置：用户自带 OpenAI 兼容端点；key 只存本机，浏览器直连（需端点允许 CORS）。 */
function AISetupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const cfg = useData((s) => s.aiConfig)
  const [baseUrl, setBaseUrl] = useState(cfg?.baseUrl ?? '')
  const [model, setModel] = useState(cfg?.model ?? '')
  const [apiKey, setApiKey] = useState(cfg?.apiKey ?? '')
  const [testing, setTesting] = useState(false)
  const urlErr = useFieldErr()
  /* urlErr 不入依赖：useFieldErr 每次渲染返回新对象，列进去等于每帧自触发；
     它只在弹层打开时被 clear，语义上 open 已经够了。 */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) { setBaseUrl(cfg?.baseUrl ?? ''); setModel(cfg?.model ?? ''); setApiKey(cfg?.apiKey ?? ''); urlErr.clear() } }, [open, cfg])

  const draft = { baseUrl, apiKey, model }
  const requireFields = (): boolean => {
    if (!baseUrl.trim() || !model.trim() || !apiKey.trim()) { urlErr.fire(t('me.aiNeedFields')); return false }
    return true
  }
  const save = (): void => {
    if (!requireFields()) return
    setAIConfig({ baseUrl: normalizeBaseUrl(baseUrl), apiKey: apiKey.trim(), model: model.trim() })
    toast(t('common.saved'), { tone: 'success' })
    onClose()
  }
  const test = async (): Promise<void> => {
    if (!requireFields()) return
    setTesting(true)
    const res = await chatCompletion(draft, [{ role: 'user', content: 'ping — reply with "ok"' }], { timeoutMs: 15_000 })
    setTesting(false)
    if (!res.ok) urlErr.fire(t(`me.aiFail.${res.error}`))
    toast(res.ok ? t('me.aiTestOk') : t(`me.aiFail.${res.error}`), { tone: res.ok ? 'success' : 'info' })
  }
  return (
    <Sheet open={open} onClose={onClose} title={t('me.aiTitle')}
      footer={
        <div className="me-acts">
          {cfg && <Button variant="danger-text" onClick={() => { setAIConfig(null); toast(t('me.aiCleared')) }}>{t('me.aiClear')}</Button>}
          <Button variant="quiet" onClick={() => void test()} loading={testing}>{t('me.aiTest')}</Button>
          <Button onClick={save}>{t('common.save')}</Button>
        </div>
      }
    >
      <div className="me-dir-form">
        <p className="t-caption">{t('me.aiHint')}</p>
        <div className="me-chips">
          {AI_PRESETS.map((p) => (
            <Chip key={p.name} on={baseUrl === p.baseUrl && model === p.model} onClick={() => { setBaseUrl(p.baseUrl); setModel(p.model) }}>{p.name}</Chip>
          ))}
        </div>
        <Field label={t('me.aiBaseUrl')} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com/v1" inputMode="url" autoComplete="off" error={urlErr.err ?? undefined} shakeKey={urlErr.shakeKey} />
        <Field label={t('me.aiModel')} value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o-mini" autoComplete="off" />
        <Field label={t('me.aiApiKey')} value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" autoComplete="off" />
      </div>
    </Sheet>
  )
}

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

  /* 线上版本身份（构建注入的 meta；dev 下为 null → 「关于」整条不出现） */
  const build = readBuildInfo()
  const copyBuild = async (): Promise<void> => {
    if (!build) return
    try {
      await navigator.clipboard.writeText(buildInfoLine(build))
      toast(t('me.aboutCopied'))
    } catch {
      toast(t('me.aboutCopyFailed'))
    }
  }

  const [dirOpen, setDirOpen] = useState(false)
  const [statement, setStatement] = useState(direction.statement)
  const [domains, setDomains] = useState(direction.domains.join(', '))
  const [goalSheet, setGoalSheet] = useState<Goal | 'new' | null>(null)
  const [routineSheet, setRoutineSheet] = useState<Routine | 'new' | null>(null)
  const [aiOpen, setAiOpen] = useState(false)

  /* 身份呈现：昵称（失焦提交）+ 自选头像（本地压缩成 data URL，不入云） */
  const profile = useData((s) => s.profile)
  const [nick, setNick] = useState(profile.nickname)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => { setNick(profile.nickname) }, [profile.nickname])

  const commitNick = (): void => {
    const v = nick.trim().slice(0, NICKNAME_MAX)
    setNick(v)
    if (v !== profile.nickname) {
      setProfile({ nickname: v })
      toast(t('common.saved'), { tone: 'success' })
    }
  }

  const onPickAvatar = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const res = await fileToAvatar(f)
    if (!res.ok) { toast(t(`me.avatarErr.${res.error}`)); return }
    setProfile({ avatar: res.dataUrl })
    toast(t('me.avatarSaved'), { tone: 'success' })
  }

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
    await authSignOut()
    void navigate('/login', { replace: true })
  }

  return (
    <div>
      {/* 图六映射：头像 + 三个真实指标 + 白卡分组 */}
      <header className="me-head">
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void onPickAvatar(e)} />
        <button
          type="button"
          className={`me-head__avatar${profile.avatar ? ' has-img' : ''}`}
          onClick={() => fileRef.current?.click()}
          aria-label={t('me.avatarPick')}
          title={t('me.avatarPick')}
        >
          {profile.avatar
            ? <img className="me-head__img" src={profile.avatar} alt="" />
            : (profile.nickname.trim()[0] ?? direction.statement.trim()[0] ?? 'E').toUpperCase()}
        </button>
        <p className="me-head__name t-h3">{profile.nickname.trim() || t('me.noName')}</p>
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
          {/* Card 本身是唯一 button；保留铅笔视觉但不再嵌套 interactive control（axe nested-interactive）。 */}
          <span className="icon-btn icon-btn--sm" aria-hidden="true">
            <Pencil size={14} />
          </span>
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

      {/* 记录组：可展开的两项收进手风琴，健康是"跳走"的动作行——同一张卡两种行为 */}
      <section aria-label={t('me.groupRecords')} style={{ marginTop: 'var(--sp-5)' }}>
        <h2 className="eyebrow sec-title">{t('me.groupRecords')}</h2>
        <Accordion
          items={[
            {
              id: 'goals',
              icon: <Target size={18} />,
              title: t('me.goalsLabel'),
              right: `${goals.length}`,
              content: (
                <>
                  <div className="me-panel__acts">
                    <IconButton size="sm" icon={<Plus size={16} aria-hidden="true" />} label={t('goal.newTitle')} onClick={() => setGoalSheet('new' as const)} />
                  </div>
                  {goals.length === 0
                    ? <EmptyState title={t('me.noGoals')} />
                    : (
                      <div className="goal-list">
                        {goals.map(({ goal, pct }) => (
                          <div key={goal.id} className="goal-row">
                            <Row title={goal.title} sub={goal.kicker ?? undefined} right={`${pct}%`} chevron onClick={() => { void navigate(`/goal/${goal.id}`) }} />
                            <Pbar pct={pct} done={pct >= 100} />
                          </div>
                        ))}
                      </div>
                    )}
                </>
              ),
            },
            {
              id: 'routines',
              icon: <Repeat size={18} />,
              title: t('me.routinesLabel'),
              right: `${routineCount}`,
              content: (
                <>
                  <div className="me-panel__acts">
                    <IconButton size="sm" icon={<Plus size={16} aria-hidden="true" />} label={t('routine.newTitle')} onClick={() => setRoutineSheet('new' as const)} />
                  </div>
                  {routines.length === 0
                    ? <EmptyState title={t('me.noRoutines')} />
                    : routines.map((r) => (
                      <Row
                        key={r.id}
                        title={r.name}
                        sub={[r.time, r.sub, r.kind === 'habit' ? t('me.habit') : t('me.routine')].filter(Boolean).join(' · ')}
                        chevron
                        onClick={() => setRoutineSheet(r)}
                      />
                    ))}
                </>
              ),
            },
            {
              id: 'health',
              icon: <HeartPulse size={18} />,
              title: t('health.title'),
              sub: t('health.entrySub'),
              onClick: () => { void navigate('/health') },
            },
          ]}
        />
      </section>

      {/* 系统组：账户与设计偏好各自收进一项，AI 接口/退出是动作行 */}
      <section aria-label={t('me.systemLabel')} style={{ marginTop: 'var(--sp-5)' }}>
        <h2 className="eyebrow sec-title">{t('me.systemLabel')}</h2>
        <Accordion
          items={[
            {
              id: 'account',
              icon: <User size={18} />,
              title: t('me.account'),
              sub: isLocalMode() ? t('me.localMode') : (displayAccount(useAuth.getState().user) || t('me.notSignedIn')),
              right: useAuth((x) => x.status) === 'signed-in' ? <Tag>{t('me.cloudOn')}</Tag> : undefined,
              content: (
                <>
                  <div className="pref pref--stack">
                    <Field
                      label={t('me.nickname')}
                      value={nick}
                      onChange={(e) => setNick(e.target.value)}
                      onBlur={commitNick}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitNick() } }}
                      placeholder={t('me.nicknamePh')}
                      maxLength={NICKNAME_MAX}
                      hint={t('me.nicknameHint')}
                    />
                  </div>
                  <div className="pref">
                    <span className="pref__label t-small">{t('me.avatar')}</span>
                    <div className="pref__acts">
                      <Button size="sm" variant="quiet" onClick={() => fileRef.current?.click()}>
                        {profile.avatar ? t('me.avatarChange') : t('me.avatarPick')}
                      </Button>
                      {profile.avatar && (
                        <Button size="sm" variant="ghost" onClick={() => { setProfile({ avatar: null }); toast(t('me.avatarRemoved')) }}>
                          {t('me.avatarRemove')}
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              ),
            },
            {
              id: 'appearance',
              icon: <Settings2 size={18} />,
              title: t('me.appearance'),
              sub: pickLabel(THEME_OPTS, theme.mode, t) + ' · ' + pickLabel(PALETTE_OPTS, theme.palette, t) + ' · ' + pickLabel(BG_OPTS, theme.bg, t) + ' · ' + pickLabel(LANG_OPTS, lang, t),
              content: (
                <>
                  <SegRow label={t('settings.theme')} opts={THEME_OPTS} value={theme.mode} onChange={(v) => theme.setMode(v)} />
                  <SegRow label={t('settings.palette')} opts={PALETTE_OPTS} value={theme.palette} onChange={(v) => theme.setPalette(v)} />
                  <SegRow label={t('settings.background')} opts={BG_OPTS} value={theme.bg} onChange={(v) => theme.setBg(v)} />
                  <SegRow label={t('settings.language')} opts={LANG_OPTS} value={lang} onChange={(v) => setLang(v)} />
                </>
              ),
            },
            {
              id: 'ai',
              icon: <Sparkles size={18} />,
              title: t('me.aiTitle'),
              sub: isConfigured(useData.getState().aiConfig) ? t('me.aiOn') : t('me.aiOff'),
              onClick: () => setAiOpen(true),
            },
            ...(hasBackend
              ? [{
                id: 'signOut',
                icon: <LogOut size={18} />,
                title: t('me.signOut'),
                onClick: () => { void signOut() },
              }]
              : []),
            /* 线上版本号：出问题时第一件要问的就是"你看到的是哪个 commit"。
               dev 构建没有这三枚 meta → 整条不渲染，不显示假版本。 */
            ...(build ? [{
              id: 'about',
              icon: <Info size={18} />,
              title: t('me.about'),
              sub: build.short,
              content: (
                <>
                  <div className="pref">
                    <span className="pref__label t-small">{t('me.aboutCommit')}</span>
                    <span className="tnum t-caption">{build.commit}</span>
                  </div>
                  <div className="pref">
                    <span className="pref__label t-small">{t('me.aboutBuilt')}</span>
                    <span className="tnum t-caption">{formatBuildTime(build.builtAt)}</span>
                  </div>
                  <div className="pref">
                    <span className="pref__label t-small">{t('me.aboutEnv')}</span>
                    <span className="tnum t-caption">{build.env}</span>
                  </div>
                  <div className="me-panel__acts">
                    <Button size="sm" variant="quiet" onClick={() => { void copyBuild() }}>{t('me.aboutCopy')}</Button>
                  </div>
                </>
              ),
            }] : []),
          ]}
        />
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
      <AISetupSheet open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  )
}
