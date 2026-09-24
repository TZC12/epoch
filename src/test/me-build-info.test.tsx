import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MePage from '@/features/me/MePage'
import { ToastProvider } from '@/components/ui/Toast'
import { initialData, useData } from '@/services/store'
import * as A from '@/services/actions'

/**
 * 「我的 → 关于此版本」的界面级回归。
 * 盯两件事：① dev（没有构建 meta）时这条必须整个不出现——出现一个假版本号比不出现更糟；
 * ② 有 meta 时要能把"哪个 commit 上线的"一眼读出并复制走，这是它存在的全部理由。
 */
const reset = (): void => {
  localStorage.clear()
  useData.persist.clearStorage()
  A.__replaceStateForTests(structuredClone(initialData))
}

const put = (name: string, content: string): void => {
  const m = document.createElement('meta')
  m.setAttribute('name', name)
  m.setAttribute('content', content)
  document.head.appendChild(m)
}
const clearMetas = (): void => { document.querySelectorAll('meta[name^="app-"]').forEach((m) => m.remove()) }

beforeEach(reset)
afterEach(() => { cleanup(); clearMetas() })

const renderPage = () => render(<ToastProvider><MemoryRouter><MePage /></MemoryRouter></ToastProvider>)

describe('我的页 · 关于此版本', () => {
  it('没有构建 meta（dev）→ 整条不渲染', () => {
    renderPage()
    expect(screen.queryByText('关于此版本')).toBeNull()
  })

  it('有构建 meta → 折叠态就能看到短 SHA，展开后是完整 commit 与环境', () => {
    put('app-version', '462557f0c894b973774126a31129c3a5776fa235')
    put('app-built', '2026-09-23T12:23:51.126Z')
    put('app-env', 'production')
    renderPage()

    fireEvent.click(screen.getByText('关于此版本'))
    expect(screen.getByText('462557f')).toBeInTheDocument()
    return waitFor(() => expect(screen.getByText('462557f0c894b973774126a31129c3a5776fa235')).toBeInTheDocument())
  })

  it('复制版本信息：写入剪贴板成功要给出确认 toast', async () => {
    put('app-version', 'abcdef1234567890')
    put('app-built', '2026-09-23T12:23:51.126Z')
    put('app-env', 'production')
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    renderPage()
    fireEvent.click(screen.getByText('关于此版本'))
    fireEvent.click(screen.getByRole('button', { name: '复制版本信息' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Epoch abcdef1234567890 · production · 2026-09-23T12:23:51.126Z'))
    await waitFor(() => expect(screen.getByText('版本信息已复制')).toBeInTheDocument())
  })
})
