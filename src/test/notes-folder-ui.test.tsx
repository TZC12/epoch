import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import NotesPage from '@/features/notes/NotesPage'
import { ToastProvider } from '@/components/ui/Toast'
import { initialData, useData } from '@/services/store'
import * as A from '@/services/actions'

/**
 * 备忘文件夹的界面级回归。
 * 重点盯一件事：扇形预览渲染在文件夹触发 <button> 的内部，
 * 一旦往预览里放可交互元素就是 <button> 嵌 <button>——HTML 非法、Chrome 报嵌套错、
 * React 还会因此产生 hydration 警告。这个结构约束只靠肉眼看不出，必须有断言。
 */
const reset = (): void => {
  localStorage.clear()
  useData.persist.clearStorage()
  A.__replaceStateForTests(structuredClone(initialData))
}
beforeEach(reset)
afterEach(cleanup)

/** 建 n 张备忘并把它们全并成一个文件夹，返回标题列表 */
function seedFolder(n: number): string[] {
  const titles = Array.from({ length: n }, (_, i) => `想法${i + 1}`)
  const ids = titles.map((title) => A.createNote({ title, body: '内容' })!.id)
  for (const id of ids.slice(1)) A.mergeNotes(id, ids[0])
  return titles
}

const renderPage = () => render(<ToastProvider><NotesPage /></ToastProvider>)

describe('NotesPage 文件夹卡', () => {
  it('文件夹卡内部只有一个 button（触发钮），预览里不嵌任何交互元素', () => {
    seedFolder(3)
    const { container } = renderPage()
    const cell = container.querySelector('.note-folder')
    expect(cell).toBeTruthy()
    expect(cell!.querySelectorAll('button')).toHaveLength(1)
    /* 预览内部不许有任何可交互元素（tabindex 只出现在触发钮自己身上，别把它算进来） */
    expect(cell!.querySelectorAll('.folder-mini button, .folder-mini a, .folder-mini [tabindex]')).toHaveLength(0)
    expect(cell!.textContent).toContain('想法1')
  })

  it('展开层里每个成员都有「打开 / 移出」，且成员多于 5 个时也全部可达', () => {
    const titles = seedFolder(8)
    const { container } = renderPage()
    fireEvent.click(container.querySelector('.note-folder button')!)
    const dialog = screen.getByRole('dialog')
    const ejects = [...dialog.querySelectorAll('button')].filter((b) => b.textContent === '移出')
    expect(ejects).toHaveLength(8)
    /* 官方扇形预览上限是 5，展开层必须不受这个上限约束（本地 fork F1） */
    expect(titles.every((t) => dialog.textContent?.includes(t))).toBe(true)
  })

  it('移出 → 该成员回散卡，文件夹仍在（还剩 2 个）', () => {
    const ids = seedFolder(3).map((t) => useData.getState().notes.find((n) => n.title === t)!.id)
    const fid = useData.getState().notes.find((n) => n.id === ids[0])!.folderId
    const { container } = renderPage()
    fireEvent.click(container.querySelector('.note-folder button')!)
    const dialog = screen.getByRole('dialog')
    fireEvent.click([...dialog.querySelectorAll('button')].find((b) => b.textContent === '移出')!)
    const s = useData.getState()
    expect(s.notes.filter((n) => n.folderId === fid)).toHaveLength(2)
    expect(s.notes.filter((n) => !n.folderId)).toHaveLength(1)
    expect(s.noteFolders.some((f) => f.id === fid)).toBe(true)
  })

  it('只剩 1 个成员时文件夹自动解散，卡片退回普通网格', () => {
    seedFolder(2)
    const { container } = renderPage()
    fireEvent.click(container.querySelector('.note-folder button')!)
    const dialog = screen.getByRole('dialog')
    const ejects = [...dialog.querySelectorAll('button')].filter((b) => b.textContent === '移出')
    fireEvent.click(ejects[0])
    fireEvent.click(ejects[0])
    expect(useData.getState().noteFolders).toHaveLength(0)
    expect(document.querySelector('.note-folder')).toBeNull()
    expect(document.querySelectorAll('.note-card')).toHaveLength(2)
  })
})
