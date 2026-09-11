import { z } from 'zod'

/**
 * AI 契约（前后端共享；server 校验输出，client 校验输入）。
 * 红线（产品审计 §15 / LifeOps review-before-save 模式）：
 *  - AI 只产 Proposal，永不直接写库；
 *  - 动作类型白名单之外一律拒绝；
 *  - 前端必须经用户「逐条接受」后才复用用户动作落库。
 */

export const AI_ABILITIES = ['plan_day', 'sort_inbox', 'review_observer'] as const
export type AIAbility = (typeof AI_ABILITIES)[number]

export const proposalTypeSchema = z.enum(['create_task', 'move_task', 'create_routine', 'adjust_note'])

export const proposalSchema = z.object({
  id: z.string().min(1),
  type: proposalTypeSchema,
  title: z.string().min(1).max(120),
  detail: z.string().max(280).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  durMin: z.number().int().min(5).max(240).optional(),
  goalId: z.string().optional(),
  refInboxId: z.string().optional(),
  refTaskId: z.string().optional(),
})

export const aiResponseSchema = z.object({
  proposals: z.array(proposalSchema).max(8),
  observations: z.array(z.string().max(240)).max(3).optional(),
})

export type AIProposalDTO = z.infer<typeof proposalSchema>
export type AIResponseDTO = z.infer<typeof aiResponseSchema>

/** 前端发送的上下文（由 lib/ai-context 从真实实体序列化；不含任何凭据）。 */
export const aiContextSchema = z.object({
  lang: z.enum(['zh', 'en']),
  today: z.string(),
  direction: z.object({
    statement: z.string().max(200),
    wake: z.string().nullable(),
    sleep: z.string().nullable(),
    work: z.string().nullable(),
  }),
  goals: z.array(z.object({
    id: z.string(),
    title: z.string().max(120),
    kicker: z.string().nullable(),
    pct: z.number().min(0).max(100),
    status: z.string(),
  })).max(10),
  todayTasks: z.array(z.object({
    id: z.string(),
    title: z.string().max(120),
    time: z.string().nullable(),
    durMin: z.number().nullable(),
    tier: z.string(),
    done: z.boolean(),
  })).max(20),
  inbox: z.array(z.object({
    id: z.string(),
    title: z.string().max(120),
    ageDays: z.number(),
  })).max(20),
  routines: z.array(z.object({
    id: z.string(),
    name: z.string().max(80),
    time: z.string().nullable(),
    durMin: z.number().nullable(),
  })).max(20),
  energy: z.enum(['low', 'normal']),
  recentStats: z.array(z.object({
    date: z.string(),
    done: z.number(),
    total: z.number(),
  })).max(14),
})

export type AIContextDTO = z.infer<typeof aiContextSchema>

export const aiRequestSchema = z.object({
  ability: z.enum(AI_ABILITIES),
  context: aiContextSchema,
})
