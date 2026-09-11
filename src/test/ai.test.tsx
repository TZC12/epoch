import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { ToastProvider } from '@/components/ui/Toast'
import { AISuggestSheet } from '@/features/ai/AISuggestSheet'
import { useData, initialData } from '@/services/store'
import * as A from '@/services/actions'

const okResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

beforeEach(() => {
  localStorage.clear()
  useData.persist.clearStorage()
  A.__replaceStateForTests(structuredClone(initialData))
})

afterEach(() => { vi.restoreAllMocks() })

function mount(ability: 'plan_day' | 'sort_inbox' | 'review_observer' = 'plan_day') {
  return render(
    <ToastProvider>
      <AISuggestSheet ability={ability} open onClose={() => {}} title="AI" />
    </ToastProvider>,
  )
}

describe('AI mutation 红线（Phase 5）', () => {
  it('正常输出 → 渲染 proposals，未勾选不落库；应用后经 actions 落库', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse({
      proposals: [
        { id: 'p1', type: 'create_task', title: '写周报', date: '2026-09-09', time: '10:00', durMin: 30 },
        { id: 'p2', type: 'adjust_note', title: '下周少排一天会' },
      ],
    }))
    mount()
    await waitFor(() => expect(screen.getByText('写周报')).toBeInTheDocument())
    expect(useData.getState().tasks).toHaveLength(0) // 预览阶段绝不落库

    fireEvent.click(screen.getByRole('checkbox', { name: '写周报' }))
    fireEvent.click(screen.getByRole('button', { name: '应用所选' }))
    await waitFor(() => expect(useData.getState().tasks).toHaveLength(1))
    expect(useData.getState().tasks[0]).toMatchObject({ title: '写周报', time: '10:00' })
    // 未勾选的 p2 记入拒绝记忆
    const rejected = JSON.parse(localStorage.getItem('epoch-ai-rejected') ?? '[]')
    expect(rejected).toContain('adjust_note::下周少排一天会')
    void spy
  })

  it('非法 JSON → bad_output 提示，零落库', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse({ proposals: [{ id: 'p1', type: 'nuke_db', title: 'x' }] }))
    mount()
    await waitFor(() => expect(screen.getByText(/无法识别/)).toBeInTheDocument())
    expect(useData.getState().tasks).toHaveLength(0)
    expect(useData.getState().inbox).toHaveLength(0)
  })

  it('越权动作类型（白名单外）→ 拒绝，零落库', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"proposals":[{"id":"p1","type":"delete_all_tasks","title":"清空"}]}', { status: 200 }))
    mount()
    await waitFor(() => expect(screen.getByText(/无法识别/)).toBeInTheDocument())
    expect(useData.getState().tasks).toHaveLength(0)
  })

  it('损坏 JSON 文本 → 拒绝', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not json at all {', { status: 200 }))
    mount()
    await waitFor(() => expect(screen.getByText(/无法识别/)).toBeInTheDocument())
  })

  it('ai_not_configured(503) → 明确提示', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }))
    mount()
    await waitFor(() => expect(screen.getByText(/未配置/)).toBeInTheDocument())
  })

  it('拒绝记忆：同一建议再次生成时被过滤', async () => {
    const payload = { proposals: [{ id: 'p1', type: 'create_task', title: '写周报', time: '10:00' }] }
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse(payload))
    const { unmount } = mount('sort_inbox')
    await waitFor(() => expect(screen.getByText('写周报')).toBeInTheDocument())
    // 不采纳直接关闭 → 记入拒绝
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(JSON.parse(localStorage.getItem('epoch-ai-rejected') ?? '[]')).toContain('create_task::写周报')
    unmount()

    act(() => { /* remount */ })
    const second = render(
      <ToastProvider>
        <AISuggestSheet ability="sort_inbox" open onClose={() => {}} title="AI" />
      </ToastProvider>,
    )
    await waitFor(() => expect(second.queryByText('写周报')).toBeNull()) // 拒绝记忆过滤后不再出现
    void spy
  })

  it('refInboxId → 应用时转换收集箱项', async () => {
    A.captureInbox('联系供应商')
    const inboxId = useData.getState().inbox[0].id
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse({
      proposals: [{ id: 'p1', type: 'create_task', title: '联系供应商', refInboxId: inboxId, time: '09:30', durMin: 30 }],
    }))
    mount('sort_inbox')
    await waitFor(() => expect(screen.getByText('联系供应商')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('checkbox', { name: '联系供应商' }))
    fireEvent.click(screen.getByRole('button', { name: '应用所选' }))
    await waitFor(() => {
      const s = useData.getState()
      expect(s.inbox[0].status).toBe('converted')
      expect(s.tasks[0]).toMatchObject({ title: '联系供应商', time: '09:30' })
    })
  })
})
