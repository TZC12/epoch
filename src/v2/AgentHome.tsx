import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, ArrowDownToLine, ArrowUpToLine, Flame, Layers, Sparkles, X } from 'lucide-react'
import { useToday, useTodayTasks, useHabitsToday } from '@/services/queries'
import { toggleHabit, toggleTask } from '@/services/actions'
import { useToast } from '@/components/ui/Toast'
import { Mascot } from './Mascot'
import { AGENT_SOURCE, streamBriefing } from './agent/briefing'
import { applyProposal, recordRejection, rejectionCount, type Proposal, type StepStatus } from './agent/model'
import './v2-screens.css'

type StepState = Record<string, Record<string, { status: StepStatus; ms?: number }>>

/* 提案的图标与 blob 色按语义分派：三条都挂同一个时钟看起来像 bug，
   而颜色/形状正是"不用读字也知道这条要干什么"的线索。
   blob 只做徽标底（里面是图标，不是文字）——见 v2-tokens.css 规矩 ①。 */
const KIND_BADGE = {
  'review-now': Layers,
  'trim-today': ArrowDownToLine,
  'capture-to-today': ArrowUpToLine,
  'habit-carry': Flame,
} as const
const KIND_BLOB = {
  'review-now': 'var(--blob-amber)',
  'trim-today': 'var(--blob-magenta)',
  'capture-to-today': 'var(--blob-blue)',
  'habit-carry': 'var(--blob-green)',
} as const

/**
 * v2 首屏 = 助手。三块内容自上而下：今日判断 → 可采纳的提案 → 一键清单。
 *
 * 为什么提案卡放在清单之上：Cue 的实证结论是"打开即答案"，
 * 用户第一眼要看到的是一个判断，而不是九个入口。
 * 但清单不能被藏起来——打卡是这个产品最高频的动作，多一跳就丢留存。
 */
export function AgentHome() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const today = useToday()
  const { toast } = useToast()
  const tasks = useTodayTasks()
  const habits = useHabitsToday()

  const [verdict, setVerdict] = useState<{ key: string; vars?: Record<string, string | number> } | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [steps, setSteps] = useState<StepState>({})
  const [streaming, setStreaming] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [adopted, setAdopted] = useState<Set<string>>(new Set())
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const ac = new AbortController()
    abortRef.current = ac
    setStreaming(true)
    void (async () => {
      /* 事件流按 LibreChat 的形状消费：verdict → 逐步 step → proposals → done。
         壳里 step 是假时长，但状态机与真接完全一致，界面不为"壳"写特例。 */
      for await (const ev of streamBriefing(ac.signal) ) {
        if (ac.signal.aborted) return
        if (ev.type === 'verdict') setVerdict({ key: ev.key, vars: ev.vars })
        else if (ev.type === 'step') {
          setSteps((prev) => ({
            ...prev,
            [ev.proposalId]: { ...(prev[ev.proposalId] ?? {}), [ev.stepId]: { status: ev.status, ms: ev.ms } },
          }))
        } else if (ev.type === 'proposals') setProposals(ev.items)
        else if (ev.type === 'done') setStreaming(false)
      }
    })()
    return () => ac.abort()
  }, [today])

  const visible = useMemo(
    () => proposals.filter((p) => !adopted.has(p.id) && !dismissed.has(p.id)),
    [proposals, adopted, dismissed],
  )

  const onAdopt = useCallback((p: Proposal) => {
    const res = applyProposal(p)
    if (!res.ok) {
      toast(t('agent.adoptFailed'), { tone: 'error' })
      return
    }
    setAdopted((s) => new Set(s).add(p.id))
    if (p.kind === 'review-now') {
      void nav('/v2/learn')
      return
    }
    /* 采纳必须可撤回：全站删除/改动的同一规矩（[[epoch-app-maturity]]） */
    toast(t('agent.adopted'), { action: res.undo ? { label: t('common.undo'), onClick: () => { res.undo?.(); setAdopted((s) => { const n = new Set(s); n.delete(p.id); return n }) } } : undefined })
  }, [nav, t, toast])

  const onReject = useCallback((p: Proposal) => {
    recordRejection(p.kind)
    setDismissed((s) => new Set(s).add(p.id))
    const n = rejectionCount(p.kind)
    toast(n >= 2 ? t('agent.willHoldBack') : t('agent.noted'))
  }, [t, toast])

  const doneCount = tasks.filter((x) => x.status === 'completed').length
  const openTasks = tasks.filter((x) => x.status !== 'completed' && x.status !== 'cancelled')

  return (
    <div className="v2-home">
      {/* ── 今日判断 ── */}
      <section className="v2-brief v2-card" aria-live="polite">
        <div className="v2-brief__head">
          <Mascot size={48} pose={streaming ? 'think' : visible.length ? 'propose' : 'done'} label={t('v2.assistant')} />
          <div className="v2-brief__txt">
            <h1 className="v2-brief__verdict t-h2">{verdict ? t(verdict.key, verdictVars(verdict.vars)) : t('agent.loading')}</h1>
            <p className="v2-brief__sub t-caption">{t('agent.sub', { n: openTasks.length, d: doneCount })}</p>
            {/* 诚实标注：现在是本地规则，不是模型。真接之后这行自动变成"来自模型" */}
            <span className="v2-src" title={t('agent.srcTip')}>
              <Sparkles size={12} aria-hidden="true" />
              {AGENT_SOURCE === 'MOCK_LOCAL_RULES' ? t('agent.srcRules') : t('agent.srcModel')}
            </span>
          </div>
        </div>
      </section>

      {/* ── 提案卡：只展开最值钱的一条，其余收进一行披露 ──
          三条全展开会把"现在就能做"（最高频动作）推到折叠线以下，
          而首屏的判据是：判断 + 1 张卡 + 至少 1 行清单必须同屏可见。 */}
      {visible.length > 0 && (
        <section className="v2-props" aria-label={t('agent.proposals')}>
          {visible.slice(0, 1).map((p) => <ProposalCard key={p.id} p={p} st={steps[p.id] ?? {}} onAdopt={onAdopt} onReject={onReject} />)}
          {visible.length > 1 && (
            <button
              type="button"
              className="v2-moreprop t-caption"
              aria-expanded={showAll}
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? t('agent.collapse') : t('agent.more', { n: visible.length - 1 })}
            </button>
          )}
          {showAll && visible.slice(1).map((p) => <ProposalCard key={p.id} p={p} st={steps[p.id] ?? {}} onAdopt={onAdopt} onReject={onReject} />)}
        </section>
      )}

      {/* ── 一键清单：最高频动作，绝不为"像 AI"多一跳 ── */}
      <section className="v2-quick" aria-label={t('v2.quick')}>
        <h2 className="v2-sec t-caption">{t('v2.quick')}</h2>
        <ul className="v2-qlist v2-card">
          {openTasks.slice(0, 5).map((task) => (
            <li key={task.id}>
              <button type="button" className="v2-qrow" aria-label={t('agent.markDone', { title: task.title })}
                onClick={() => { toggleTask(task.id) /* TODO v2: 接回 PhysicsConfetti（需先把 HomePage 的 celebrateIfCleared 抽成共享模块） */ }}>
                <span className="v2-qbox" aria-hidden="true" />
                <span className="v2-qtxt t-body">{task.title}</span>
                {task.time && <span className="v2-qtime tnum t-caption">{task.time}</span>}
              </button>
            </li>
          ))}
          {openTasks.length === 0 && <li className="v2-qempty t-caption">{t('v2.quickEmpty')}</li>}
        </ul>

        {habits.length > 0 && (
          <ul className="v2-qhabits">
            {habits.slice(0, 4).map((h) => (
              <li key={h.routine.id}>
                <button type="button" className={`v2-qchip ${h.done ? 'is-on' : ''}`} aria-pressed={h.done}
                  onClick={() => { toggleHabit(h.routine.id) }}>
                  <span className="v2-qchip__blob" aria-hidden="true" />
                  {h.routine.name}
                  {h.streak > 0 && <b className="tnum">{h.streak}</b>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/**
 * 提案卡：标题 + 依据 + 三键（就这么办 / 我自己改 / 不用）。
 * 展开后能看到「依据字段」与「它做了什么」的步骤轨迹——
 * 轨迹状态全 done 才允许采纳，避免用户对着一个还没算完的结论点头。
 */
function ProposalCard({ p, st, onAdopt, onReject }: {
  p: Proposal
  st: Record<string, { status: StepStatus; ms?: number }>
  onAdopt: (p: Proposal) => void
  onReject: (p: Proposal) => void
}) {
  const { t } = useTranslation()
  const nav = useNavigate()
  /* null = 未手动干预：此时轨迹跟着"还在跑吗"走。
     跑完自动收起（首屏预算有限），没跑完必须可见——否则"可回放轨迹"
     这件卖点根本没人看到过。手动点开/收起优先。 */
  const [open, setOpen] = useState<boolean | null>(null)
  const Badge = KIND_BADGE[p.kind]
  const allDone = p.steps.every((s) => st[s.id]?.status === 'done')
  const show = open ?? !allDone
  return (
    <article className="v2-prop v2-card">
      <button type="button" className="v2-prop__head" aria-expanded={show} onClick={() => setOpen(!show)}>
        <span className="v2-prop__title t-body">{t(p.titleKey, p.titleVars ?? {})}</span>
        <span className="v2-prop__why t-caption">{t(p.reasonKey, p.reasonVars ?? {})}</span>
        <span className="v2-prop__badge" style={{ background: KIND_BLOB[p.kind] }} aria-hidden="true">
          <Badge size={15} />
        </span>
      </button>

      {show && (
        <div className="v2-prop__trace">
          <p className="v2-prop__traceLabel t-caption">{t('agent.basis')}</p>
          <ul className="v2-prop__evid">
            {p.evidence.map((e) => (
              <li key={e.labelKey}><span className="t-caption">{t(e.labelKey)}</span><b className="tnum">{e.value}</b></li>
            ))}
          </ul>
          <p className="v2-prop__traceLabel t-caption">{t('agent.steps')}</p>
          <ol className="v2-prop__steps">
            {p.steps.map((s) => {
              const v = st[s.id]
              return (
                <li key={s.id} data-status={v?.status ?? 'pending'}>
                  <span className="v2-prop__dot" aria-hidden="true" />
                  <span className="t-caption">{t(s.labelKey)}</span>
                  {v?.status === 'done' && <span className="v2-prop__ms tnum">{v.ms}ms</span>}
                </li>
              )
            })}
          </ol>
        </div>
      )}

      <div className="v2-prop__acts">
        <button type="button" className="v2-act v2-act--go" onClick={() => onAdopt(p)} disabled={!allDone}>
          <Check size={16} aria-hidden="true" />
          {t(p.kind === 'review-now' ? 'agent.doReview' : 'agent.adopt')}
        </button>
        <button type="button" className="v2-act" onClick={() => { void nav(p.kind === 'trim-today' ? '/v2/plan' : '/v2/today') }}>
          {t('agent.adjust')}
        </button>
        <button type="button" className="v2-act v2-act--no" onClick={() => onReject(p)}>
          <X size={16} aria-hidden="true" />
          {t('agent.no')}
        </button>
      </div>
    </article>
  )
}

/** i18n vars 里数字要显式转字符串，否则 react-i18next 的插值类型不通 */
function verdictVars(v?: Record<string, string | number>) {
  if (!v) return {}
  return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, String(val)]))
}
