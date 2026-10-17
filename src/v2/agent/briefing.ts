import { deriveProposals, readSuppressed, type Proposal, type StepStatus } from './model'
import { useData } from '@/services/store'
import { todayKey } from '@/lib/dates'

/* ═══════════════════════════════════════════════════════════════════
   Agent 接缝 · 这一层是"壳"，也是将来换成真模型时唯一要改的文件
   ───────────────────────────────────────────────────────────────────
   现状（2026-10-18 用户拍板：先做体验壳，AI 后面接）：
   · 提案内容**全部来自真实 store 的规则派生**（见 model.ts），没有一条是编的；
   · "模型"只负责两件事：① 决定先说哪条 ② 分帧吐出步骤，让进度可见。
   · 所以这里**零网络请求**，验收脚本会断言这一点。

   将来接 GLM 时（src/lib/ai-client.ts 已有流式与错误码约定）：
   1. 保持 BriefEvent 事件形状不变 → 调用方（AgentHome）一行都不用改；
   2. 把 proposals 的来源换成"模型给的候选 + 本地校验"，
      **校验不过就不许落地**：模型只能提名，写库仍走 model.applyProposal；
   3. 保留 AGENT_SOURCE 常量，界面据此显示"依据来自本地规则 / 来自模型"，
      不要让用户以为壳是真 AI（这是诚实问题，不是美观问题）。
   ═══════════════════════════════════════════════════════════════════ */

/** 界面用它标注来源；换成真模型后改成 'MODEL_GLM' 之类 */
export const AGENT_SOURCE = 'MOCK_LOCAL_RULES' as const

export type BriefEvent =
  | { type: 'verdict'; key: string; vars?: Record<string, string | number> }
  | { type: 'step'; proposalId: string; stepId: string; status: StepStatus; ms: number }
  | { type: 'proposals'; items: Proposal[] }
  | { type: 'done' }

/** 今日判断：一句话，读屏和视觉同一份。语义码，不在这里出中文。 */
export function deriveVerdict(today: string): { key: string; vars?: Record<string, string | number> } {
  const s = useData.getState()
  const mains = s.tasks.filter(
    (t) => t.tier === 'main' && (t.status === 'planned' || t.status === 'scheduled') && (t.date === today || t.date === null),
  )
  const done = s.tasks.filter((t) => t.tier === 'main' && t.status === 'completed' && (t.date === today || t.date === null))
  const due = s.learnWords.filter((w) => w.due <= today && (s.learnActive ? w.langId === s.learnActive : true))

  if (mains.length === 0 && done.length === 0 && due.length === 0) return { key: 'agent.verdict.light' }
  if (mains.length > 3) return { key: 'agent.verdict.heavy', vars: { n: mains.length } }
  if (mains.length > 0 && due.length > 0) return { key: 'agent.verdict.split', vars: { n: mains.length, m: due.length } }
  if (due.length > 0) return { key: 'agent.verdict.due', vars: { m: due.length } }
  return { key: 'agent.verdict.doing', vars: { n: mains.length } }
}

/* 壳的"节奏"：每步 180~420ms。太快=看不出它在干活（等于没做进度可见性），
   太慢=用户等着。真接模型时这段由真实 token 流取代，形状不变。 */
const STEP_MS = [220, 300, 180]

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve()
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => { clearTimeout(t); resolve() }, { once: true })
  })
}

/**
 * 生成一次简报。AsyncGenerator 而不是回调：
 * 组件卸载 / 用户中途改数据时能干净地停掉（AbortSignal），
 * 不会留下"半截流还在往 state 里写"的脏状态。
 */
export async function* streamBriefing(signal?: AbortSignal): AsyncGenerator<BriefEvent> {
  const today = todayKey()
  yield { type: 'verdict', ...deriveVerdict(today) }

  const proposals = deriveProposals(today, readSuppressed())
  /* 卡片**先出**，步骤再逐条点亮。
     原先是全部算完才 yield proposals，结果：① 首屏 2 秒空白；
     ② 轨迹动画跑在还没挂载的 DOM 上，"可见进度"这件核心卖点等于没做。
     验收脚本就是照这个顺序断言的。 */
  yield { type: 'proposals', items: proposals }

  for (const p of proposals) {
    for (let i = 0; i < p.steps.length; i++) {
      if (signal?.aborted) return
      const ms = STEP_MS[i % STEP_MS.length]
      yield { type: 'step', proposalId: p.id, stepId: p.steps[i].id, status: 'running', ms }
      await wait(ms, signal)
      yield { type: 'step', proposalId: p.id, stepId: p.steps[i].id, status: 'done', ms }
    }
  }

  yield { type: 'done' }
}
