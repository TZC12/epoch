import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AIPreview, type AIProposal } from '@/components/ui/AIPreview'
import { useToast } from '@/components/ui/Toast'
import { requestAI, rememberRejected } from '@/lib/ai-client'
import { createTask, convertInboxItem, updateTask, createRoutine, captureInbox } from '@/services/actions'
import { todayKey } from '@/lib/dates'
import type { AIAbility, AIProposalDTO } from '@/shared/ai-schema'

/**
 * AI 三能力共用宿主（Phase 5）：
 * Understand→Generate（requestAI）→Preview（AIPreview）→Confirm（逐条勾选）→Apply（复用用户动作）。
 * 关闭时未采纳的建议记入拒绝记忆，不再重复建议。
 */
export function AISuggestSheet({ ability, open, onClose, title }: { ability: AIAbility; open: boolean; onClose: () => void; title: string }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [observations, setObservations] = useState<string[]>([])
  const [items, setItems] = useState<AIProposal[]>([])
  const [accepted, setAccepted] = useState<ReadonlySet<string>>(new Set())
  const [dtoById, setDtoById] = useState<Map<string, AIProposalDTO>>(new Map())

  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    setFailed(null)
    setAccepted(new Set())
    void requestAI(ability).then((res) => {
      if (!alive) return
      setLoading(false)
      if (!res.ok) {
        setFailed(res.error)
        return
      }
      setObservations(res.observations ?? [])
      const map = new Map<string, AIProposalDTO>()
      const list: AIProposal[] = res.proposals.map((p) => {
        map.set(p.id, p)
        return { id: p.id, type: p.type, title: p.title, detail: p.detail }
      })
      setDtoById(map)
      setItems(list)
    })
    return () => { alive = false }
  }, [open, ability, toast])

  const rememberUnpicked = (appliedIds: string[]): void => {
    const applied = new Set(appliedIds)
    for (const p of items) {
      if (!applied.has(p.id)) rememberRejected({ type: p.type, title: p.title })
    }
  }

  const applyOne = (p: AIProposalDTO): void => {
    const today = todayKey()
    switch (p.type) {
      case 'create_task': {
        if (p.refInboxId) convertInboxItem(p.refInboxId, { date: p.date ?? today, time: p.time ?? null, durMin: p.durMin ?? null })
        else createTask({ title: p.title, date: p.date ?? today, time: p.time ?? null, durMin: p.durMin ?? null, goalId: p.goalId ?? null })
        break
      }
      case 'move_task': {
        if (p.refTaskId) updateTask(p.refTaskId, { date: p.date ?? today, time: p.time ?? null })
        break
      }
      case 'create_routine':
        createRoutine({ name: p.title, time: p.time ?? null, durMin: p.durMin ?? null })
        break
      case 'adjust_note':
        captureInbox(p.title, p.detail ?? null, 'ai')
        break
    }
  }

  const onApply = (ids: string[]): void => {
    for (const id of ids) {
      const p = dtoById.get(id)
      if (p) applyOne(p)
    }
    rememberUnpicked(ids)
    onClose()
    toast(t('ai.applied', { n: ids.length }), { tone: 'success' })
  }

  const dismiss = (): void => {
    rememberUnpicked([])
    onClose()
  }

  return (
    <AIPreview
      open={open}
      onClose={dismiss}
      title={title}
      proposals={items}
      accepted={accepted}
      onToggle={(id) => setAccepted((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })}
      onApply={onApply}
      applyLabel={t('ai.apply')}
      closeLabel={t('common.close')}
      loading={loading}
      notes={failed ? [t(`ai.fail.${failed}`)] : observations}
    />
  )
}
