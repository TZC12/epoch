import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen, Ear, Mic, MicOff, SpellCheck, Flame, Sparkles, FileDown, CalendarClock } from 'lucide-react'
import { VoiceBeam, useMicrophone } from 'voice-glow'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Field, Textarea } from '@/components/ui/Field'
import { Stepper } from '@/components/ui/Stepper'
import { Sheet } from '@/components/ui/Sheet'
import { Pbar } from '@/components/ui/Pbar'
import { Row } from '@/components/ui/Row'
import { TipGroup } from '@/components/ui/Tooltip'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { useFieldErr } from '@/lib/useFieldErr'
import { useData } from '@/services/store'
import { useLearnToday, useWordsDue } from '@/services/queries'
import { addLearnLang, removeLearnLang, setLearnActive, logLearn, addLearnWord, deleteLearnWord, importWords, gradeWord, applyWordPatches } from '@/services/actions'
import { LEARN_PRESETS, WORD_BANKS } from '@/services/learn-bank'
import { organizeWords, isConfigured } from '@/lib/ai-provider'
import { fmtClock } from '@/lib/dates'
import type { LearnMode } from '@/services/types'
import '@/features/today/home.css'
import './learn-page.css'

/** 背单词复习 sheet：dueOnly=只刷今日到期词（打分驱动 Leitner）；否则内置+自建洗牌。 */
function WordReviewSheet({ open, onClose, dueOnly = false }: { open: boolean; onClose: () => void; dueOnly?: boolean }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const langs = useData((s) => s.learnLangs)
  const activeId = useData((s) => s.learnActive)
  const customAll = useData((s) => s.learnWords)
  const due = useWordsDue(activeId)
  const lang = langs.find((l) => l.id === activeId) ?? null

  const bank = useMemo(() => {
    if (!lang) return []
    if (dueOnly) return due.map((w) => ({ id: w.id, word: w.word, meaning: w.meaning, example: w.example }))
    const builtin = (WORD_BANKS[lang.name] ?? []).map((w, i) => ({ id: `b${i}`, word: w.word, meaning: w.meaning, example: null as string | null }))
    const custom = customAll.filter((w) => w.langId === lang.id).map((w) => ({ id: w.id, word: w.word, meaning: w.meaning, example: w.example }))
    return [...builtin, ...custom].sort(() => Math.random() - 0.5)
  }, [lang, customAll, dueOnly, due])

  const [cursor, setCursor] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const startRef = useRef<number | null>(null)
  useEffect(() => {
    if (open) { setCursor(0); setRevealed(false); setReviewed(0); startRef.current = null }
  }, [open])

  if (!lang) return null
  const card = bank[cursor]

  const advance = (known: boolean): void => {
    startRef.current ??= Date.now()
    setReviewed((n) => n + 1)
    /* 真实词库条目（非内置 b* 合成 id）→ 打分进 Leitner */
    if (!card.id.startsWith('b')) gradeWord(card.id, known)
    setRevealed(false)
    setCursor((c) => (c + 1) % Math.max(1, bank.length))
  }
  const commit = (): void => {
    const minutes = startRef.current ? Math.max(1, Math.round((Date.now() - startRef.current) / 60000)) : 0
    if (reviewed > 0 && minutes > 0) {
      logLearn(lang.id, 'words', reviewed, minutes)
      toast(t('learn.sessionDone', { n: reviewed, m: minutes }), { tone: 'success' })
    }
    onClose()
  }

  return (
    <Sheet open={open} onClose={commit} title={`${lang.name} · ${dueOnly ? t('learn.reviewDueTitle') : t('learn.mWords')}`} tall
      footer={
        <div className="learn-sheet__acts">
          <Button variant="quiet" onClick={commit}>{t('learn.quit')}</Button>
          <Button onClick={commit} disabled={reviewed === 0}>{t('learn.commit')}</Button>
        </div>
      }
    >
      {bank.length === 0 ? (
        <EmptyState title={dueOnly ? t('learn.dueCleared') : t('learn.emptyBank')} />
      ) : (
        <div className="learn-review">
          <div className="learn-count t-caption tnum">{reviewed} / {bank.length}</div>
          <button type="button" className="learn-card" onClick={() => setRevealed(true)}>
            <span className="learn-card__word t-h2">{card?.word}</span>
            {revealed
              ? <span className="learn-card__mean t-body">{card?.meaning}{card?.example ? <em className="learn-card__ex t-caption">{" "}{card.example}</em> : null}</span>
              : <span className="learn-card__hint t-caption">{t('learn.reveal')}</span>}
          </button>
          {revealed && (
            <div className="learn-review__acts">
              <Button block variant="quiet" onClick={() => advance(false)}>{t('learn.unknown')}</Button>
              <Button block onClick={() => advance(true)}>{t('learn.know')}</Button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}

/** 听力/口语/语法：纯计时 sheet，结束按分钟记账。口语模式带麦克风 + VoiceBeam 声浪反馈。 */
function LearnTimerSheet({ mode, open, onClose }: { mode: LearnMode; open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const langs = useData((s) => s.learnLangs)
  const activeId = useData((s) => s.learnActive)
  const lang = langs.find((l) => l.id === activeId) ?? null
  const mic = useMicrophone()
  const themeMode = useTheme((s) => s.mode)
  const dark = themeMode === 'dark' || (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [running, setRunning] = useState(false)
  const [sec, setSec] = useState(0)
  useEffect(() => {
    if (!open) { setRunning(false); setSec(0); mic.stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(() => {
    if (!running) return
    const iv = window.setInterval(() => setSec((s) => s + 1), 1000)
    return () => window.clearInterval(iv)
  }, [running])
  if (!lang) return null
  const onFinish = (): void => {
    const minutes = Math.max(1, Math.round(sec / 60))
    logLearn(lang.id, mode, 0, minutes)
    toast(t('learn.timerLogged', { m: minutes }), { tone: 'success' })
    mic.stop()
    onClose()
  }
  const speaking = mode === 'speaking'
  const micOff = mic.state === 'denied' || mic.state === 'unsupported'
  const timerBody = (
    <div className="learn-timer">
      <div className="learn-timer__clock tnum">{fmtClock(sec)}</div>
      <p className="t-caption">{t('learn.timerHint')}</p>
      {speaking && (
        <button
          type="button"
          className={`learn-mic ${mic.state === 'live' ? 'learn-mic--live' : ''}`}
          disabled={micOff}
          onClick={() => { if (mic.state === 'live') mic.stop(); else void mic.start() }}
        >
          {mic.state === 'live' ? <MicOff size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
          {t(mic.state === 'live' ? 'learn.stopMic' : micOff ? 'learn.micDenied' : 'learn.listen')}
        </button>
      )}
      {!running && sec === 0 && <Button block onClick={() => setRunning(true)}>{t('fit.start')}</Button>}
      {running && <Button block variant="quiet" onClick={() => { setRunning(false); setSec(0) }}>{t('common.cancel')}</Button>}
    </div>
  )
  return (
    <Sheet open={open} onClose={onClose} title={`${lang.name} · ${t(`learn.m${mode[0].toUpperCase()}${mode.slice(1)}`)}`}
      footer={
        <div className="learn-sheet__acts">
          {running
            ? <Button block variant="quiet" onClick={() => setRunning(false)}>{t('fit.stop')}</Button>
            : <Button block onClick={onFinish} disabled={sec === 0}>{t('learn.commit')}</Button>}
        </div>
      }
    >
      {speaking ? (
        /* mono 配色贴合暖编辑风；麦克风在点击手势里申请（Safari 要求） */
        <VoiceBeam type="mobile" stream={mic.stream} active={mic.state === 'live'} colorVariant="mono" theme={dark ? 'dark' : 'light'}>
          {timerBody}
        </VoiceBeam>
      ) : timerBody}
    </Sheet>
  )
}

/** 添加语言 sheet：预设 chips + 自定义名 + 每日目标。 */
function AddLangSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('30')
  useEffect(() => { if (open) { setName(''); setGoal('30') } }, [open])
  const nameErr = useFieldErr()
  const submit = (): void => {
    const clean = name.trim()
    if (!clean) { nameErr.fire(t('learn.needLangName')); return }
    if (addLearnLang(clean, Number(goal) || 30)) onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={t('learn.addLang')}
      footer={
        <div className="learn-sheet__acts">
          <Button variant="quiet" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={submit}>{t('common.save')}</Button>
        </div>
      }
    >
      <div className="learn-add">
        <div className="learn-add__presets">
          {LEARN_PRESETS.map((p) => (
            <Chip key={p} on={name === p} onClick={() => setName(p)}>{p}</Chip>
          ))}
        </div>
        <Field label={t('learn.langs')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('learn.namePlaceholder')} error={nameErr.err ?? undefined} shakeKey={nameErr.shakeKey} />
        <Stepper label={t('learn.goalLabel')} value={goal} onChange={setGoal} min={5} max={500} step={5} unit={t('learn.goalUnit')} />
      </div>
    </Sheet>
  )
}

/** 一键导入词库 sheet：粘贴文本 / 选文件（txt/csv/json），可勾选导入后自动 AI 整理。 */
function ImportSheet({ open, onClose, langId, langName, aiReady, onOrganize }: {
  open: boolean; onClose: () => void; langId: string | null; langName: string
  aiReady: boolean; onOrganize: (words: { word: string; meaning: string }[]) => Promise<void>
}) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [text, setText] = useState('')
  const [withAI, setWithAI] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setText(''); setWithAI(aiReady); setBusy(false) } }, [open, aiReady])
  const doFile = async (f: File | undefined): Promise<void> => {
    if (!f) return
    setText(await f.text())
  }
  const cErr = useFieldErr()
  const submit = async (): Promise<void> => {
    if (!langId) return
    if (!text.trim()) { cErr.fire(t('learn.needContent')); return }
    const r = importWords(langId, text)
    toast(t('learn.importDone', { added: r.added, skipped: r.skipped, invalid: r.invalid }), { tone: r.added ? 'success' : 'info' })
    if (r.added > 0) {
      if (withAI && aiReady) {
        setBusy(true)
        await onOrganize(r.fresh.map((w) => ({ word: w.word, meaning: w.meaning })))
        setBusy(false)
      }
      onClose()
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title={`${t('learn.importTitle')} · ${langName}`} tall
      footer={
        <div className="learn-sheet__acts">
          <Button variant="quiet" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => void submit()} loading={busy}>{t('learn.importBtn')}</Button>
        </div>
      }
    >
      <div className="learn-import">
        <p className="t-caption">{t('learn.importHint')}</p>
        <input type="file" accept=".txt,.csv,.json,text/plain,application/json" onChange={(e) => void doFile(e.target.files?.[0])} aria-label={t('learn.importFile')} />
        <Textarea label={t('learn.importPaste')} rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={'apple, 苹果\nbanana\t香蕉'} error={cErr.err ?? undefined} shakeKey={cErr.shakeKey} />
        {aiReady && <Chip on={withAI} onClick={() => setWithAI((v) => !v)}>{t('learn.importWithAI')}</Chip>}
      </div>
    </Sheet>
  )
}

const MODES: { mode: LearnMode; Icon: typeof BookOpen }[] = [
  { mode: 'words', Icon: BookOpen },
  { mode: 'listening', Icon: Ear },
  { mode: 'speaking', Icon: Mic },
  { mode: 'grammar', Icon: SpellCheck },
]

/**
 * LearnPage（概念稿 page4）：今日学习卡（词数/分钟/进度/连续）→ 语言 chips + 添加 →
 * MODES 四行（背单词=复习流；其余=计时）→ 我的生词（自建词管理）。
 */
export default function LearnPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const view = useLearnToday()
  const langs = useData((s) => s.learnLangs)
  const activeId = useData((s) => s.learnActive)
  const customAll = useData((s) => s.learnWords)
  const aiConfig = useData((s) => s.aiConfig)
  const dueWords = useWordsDue(activeId)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [dueOpen, setDueOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [timerMode, setTimerMode] = useState<LearnMode | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [wWord, setWWord] = useState('')
  const [wMean, setWMean] = useState('')
  const wErr = useFieldErr()
  const mErr = useFieldErr()

  const myWords = customAll.filter((w) => w.langId === activeId)

  /** AI 整理（按钮手动触发 / 导入连招共用）：只处理传入词表，回填后 toast。 */
  const organizeList = async (list: { word: string; meaning: string }[]): Promise<void> => {
    if (!view.lang) return
    if (!isConfigured(aiConfig)) { toast(t('learn.aiNotConfigured')); return }
    if (list.length === 0) { toast(t('learn.aiNoWords')); return }
    setAiBusy(true)
    const res = await organizeWords(aiConfig, view.lang.name, list)
    setAiBusy(false)
    if (!res.ok) { toast(t(`learn.aiFail.${res.error}`)); return }
    const hit = applyWordPatches(res.patches, view.lang.id)
    toast(t('learn.aiDone', { n: hit }), { tone: hit > 0 ? 'success' : 'info' })
  }

  return (
    <div className="learn">
      <header className="home-head">
        <div className="home-head__col">
          <span className="eyebrow">{t('learn.eyebrow')}{view.lang ? ` · ${view.lang.name}` : ''}</span>
          <h1 className="t-h1">{t('learn.title')}</h1>
        </div>
      </header>

      {/* 今日学习卡 */}
      {view.lang ? (
        <section className="learn-today" aria-label={t('learn.todayLabel')}>
          <div className="learn-today__head">
            <span className="eyebrow">{t('learn.todayLabel')}</span>
            {view.streak > 0 && (
              <span className="learn-today__streak"><Flame size={14} aria-hidden="true" /><span className="tnum">{t('learn.streak', { n: view.streak })}</span></span>
            )}
          </div>
          <div className="learn-today__nums">
            <span className="learn-today__num tnum">{view.words}<i>{t('learn.words')}</i></span>
            <span className="learn-today__num tnum">{view.minutes}<i>{t('learn.minutesShort')}</i></span>
          </div>
          <Pbar pct={Math.round(view.pct * 100)} done={view.pct >= 1} label={`${view.words}/${view.lang.goal}`} />
          <p className="t-caption learn-today__goal">{t('learn.goalLine', { goal: view.lang.goal })}</p>
        </section>
      ) : (
        <EmptyState title={t('learn.noLang')} action={<Button variant="quiet" onClick={() => setAddOpen(true)}>{t('learn.addLang')}</Button>} />
      )}

      {/* 今日到期复习（Leitner：due<=今天） */}
      {view.lang && dueWords.length > 0 && (
        <section className="learn-due" aria-label={t('learn.reviewDueTitle')}>
          <Row
            title={t('learn.reviewDueTitle')}
            sub={t('learn.dueCount', { n: dueWords.length })}
            rightIcon={<CalendarClock size={18} aria-hidden="true" />}
            chevron
            onClick={() => setDueOpen(true)}
          />
        </section>
      )}

      {/* 语言 chips + 添加（悬停气泡：一组一个，标签间滑行） */}
      <TipGroup className="learn-langs tip-group--wrap">
        {langs.map((l) => (
          <span key={l.id} data-tip={t('learn.goalLine', { goal: l.goal })}>
            <Chip on={l.id === activeId} onClick={() => setLearnActive(l.id)}>{l.name}</Chip>
          </span>
        ))}
        <Chip on={false} onClick={() => setAddOpen(true)}>+ {t('learn.addLang')}</Chip>
      </TipGroup>

      {/* MODES */}
      {view.lang && (
        <section aria-label={t('learn.modes')}>
          <h2 className="eyebrow learn-sec-title">{t('learn.modes')}</h2>
          <div className="learn-mode-list">
            {MODES.map(({ mode, Icon }) => (
              <Row
                key={mode}
                rightIcon={<Icon size={18} aria-hidden="true" />}
                title={t(`learn.m${mode[0].toUpperCase()}${mode.slice(1)}`)}
                sub={mode === 'words' ? t('learn.mWordsSub') : t('learn.mTimerSub')}
                chevron
                onClick={() => (mode === 'words' ? setReviewOpen(true) : setTimerMode(mode))}
              />
            ))}
          </div>
        </section>
      )}

      {/* 我的生词 */}
      {view.lang && (
        <section aria-label={t('learn.customWords')}>
          <div className="learn-sec-head">
            <h2 className="eyebrow learn-sec-title">{t('learn.customWords')}</h2>
            <div className="learn-sec-acts">
              <Button size="sm" variant="quiet" onClick={() => setImportOpen(true)}>
                <FileDown size={14} aria-hidden="true" /> {t('learn.importBtn')}
              </Button>
              <Button size="sm" variant="quiet" loading={aiBusy} disabled={!view.lang} onClick={() => void organizeList(myWords.map((w) => ({ word: w.word, meaning: w.meaning })))}>
                <Sparkles size={14} aria-hidden="true" /> {t('learn.aiOrganize')}
              </Button>
            </div>
          </div>
          <div className="learn-word-add">
            <Field label={t('learn.wordField')} value={wWord} onChange={(e) => setWWord(e.target.value)} error={wErr.err ?? undefined} shakeKey={wErr.shakeKey} />
            <Field label={t('learn.meaningField')} value={wMean} onChange={(e) => setWMean(e.target.value)} error={mErr.err ?? undefined} shakeKey={mErr.shakeKey} />
            <Button variant="quiet" onClick={() => {
              if (!wWord.trim()) { wErr.fire(t('learn.needWord')); return }
              if (!wMean.trim()) { mErr.fire(t('learn.needMeaning')); return }
              if (activeId && addLearnWord(activeId, wWord, wMean)) { wErr.clear(); mErr.clear(); setWWord(''); setWMean('') }
            }}>{t('learn.addWord')}</Button>
          </div>
          {myWords.length > 0 && (
            <div className="learn-words">
              {myWords.map((w) => (
                <div key={w.id} className="learn-word">
                  <span className="learn-word__w t-small">{w.word}{w.tag && <span className="learn-word__tag">{w.tag}</span>}</span>
                  <span className="learn-word__m t-caption">{w.meaning}{w.example ? ` · ${w.example}` : ''}</span>
                  <button type="button" className="task-row__del" aria-label={t('common.delete')} onClick={() => deleteLearnWord(w.id)}>×</button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 语言管理：移除当前语言 */}
      {langs.length > 0 && (
        <div className="learn-langmgmt">
          <Button variant="danger-text" size="sm" disabled={!view.lang} onClick={() => {
            if (view.lang && window.confirm(t('learn.confirmRemove'))) removeLearnLang(view.lang.id)
          }}>{t('learn.removeLang')}</Button>
        </div>
      )}

      <WordReviewSheet open={reviewOpen} onClose={() => setReviewOpen(false)} />
      <WordReviewSheet open={dueOpen} onClose={() => setDueOpen(false)} dueOnly />
      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} langId={activeId} langName={view.lang?.name ?? ''} aiReady={isConfigured(aiConfig)} onOrganize={organizeList} />
      {timerMode && <LearnTimerSheet mode={timerMode} open onClose={() => setTimerMode(null)} />}
      <AddLangSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
