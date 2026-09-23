import { beforeEach, describe, expect, it } from 'vitest'
import { useData, initialData } from '@/services/store'
import * as A from '@/services/actions'
import { pickTarget, clampToSafe, HOLD_MS, MOVE_TOL, type DropTarget } from '@/features/notes/use-note-drag'

const reset = (): void => {
  localStorage.clear()
  useData.persist.clearStorage()
  A.__replaceStateForTests(structuredClone(initialData))
}
beforeEach(reset)

/** 建 n 张备忘，返回 id（新→旧）。 */
const mk = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => A.createNote({ title: `备忘${i + 1}` })!.id)

const slot = (id: string): string | null => useData.getState().notes.find((x) => x.id === id)!.folderId ?? null
const membersOf = (fid: string): string[] => useData.getState().notes.filter((x) => x.folderId === fid).map((x) => x.id)

describe('备忘成组（mergeNotes / eject / dissolve）', () => {
  it('两张散卡叠在一起 → 新建文件夹，两张都进去，文件夹名取被丢到的那张', () => {
    const [a, b] = mk(2)
    const undo = A.mergeNotes(a, b)
    expect(undo).not.toBeNull()
    const fid = slot(a)
    expect(fid).toBeTruthy()
    expect(slot(b)).toBe(fid)
    expect(useData.getState().noteFolders.find((f) => f.id === fid)?.title).toBe('备忘2')
  })

  it('第三张丢进已有文件夹 → 加入同一个夹，不再新建', () => {
    const [a, b, c] = mk(3)
    A.mergeNotes(a, b)
    const before = useData.getState().noteFolders.length
    A.mergeNotes(c, a)
    expect(useData.getState().noteFolders.length).toBe(before)
    expect(slot(c)).toBe(slot(a))
    expect(membersOf(slot(c)!)).toHaveLength(3)
  })

  it('同文件夹内互丢 = 无事发生（返回 null，不产生撤销凭据）', () => {
    const [a, b] = mk(2)
    A.mergeNotes(a, b)
    expect(A.mergeNotes(a, b)).toBeNull()
    expect(A.mergeNotes(a, a)).toBeNull()
  })

  it('移出到只剩 1 个成员时文件夹自动解散（界面上不该出现空/单卡文件夹）', () => {
    const [a, b] = mk(2)
    A.mergeNotes(a, b)
    const fid = slot(a)!
    A.ejectNote(b)
    expect(useData.getState().noteFolders.some((f) => f.id === fid)).toBe(false)
    expect(slot(a)).toBeNull()
    expect(slot(b)).toBeNull()
  })

  it('只移动被拖的那一张：从 F2 拖进 F1，F2 剩下 1 张就就地解散', () => {
    const [a, b, c, d] = mk(4)
    A.mergeNotes(a, b)
    A.mergeNotes(c, d)
    const f1 = slot(a), f2 = slot(c)
    expect(f1).not.toBe(f2)
    A.mergeNotes(c, a)
    expect(slot(c)).toBe(f1)
    expect(useData.getState().noteFolders.some((f) => f.id === f2)).toBe(false)
    expect(slot(d)).toBeNull()               // F2 只剩它一张 → 摊回散卡，而不是被顺带搬走
    expect(membersOf(f1!)).toHaveLength(3)
  })

  it('撤销凭据能整幅还原：合并后 undo → 只有这一次移动被抹掉', () => {
    const [a, b, c] = mk(3)
    A.mergeNotes(c, a)
    const fid = slot(a)!
    const undo = A.mergeNotes(a, b)!
    expect([slot(a), slot(b), slot(c)]).toEqual([fid, fid, fid])
    A.undoGroup(undo)
    expect([slot(a), slot(b), slot(c)]).toEqual([fid, null, fid])
    expect(useData.getState().noteFolders).toHaveLength(1)
  })

  it('解散整个文件夹 → 成员全回散卡', () => {
    const ids = mk(3)
    for (const id of ids.slice(1)) A.mergeNotes(id, ids[0])
    const fid = slot(ids[0])!
    const undo = A.dissolveFolder(fid)!
    expect(useData.getState().noteFolders).toHaveLength(0)
    expect(ids.every((id) => slot(id) === null)).toBe(true)
    A.undoGroup(undo)
    expect(ids.every((id) => slot(id) === fid)).toBe(true)
  })
})

describe('拖拽命中与安全区（纯函数）', () => {
  const r = (left: number, top: number, w: number, h: number) => ({ left, top, right: left + w, bottom: top + h })
  const targets: DropTarget[] = [
    { id: 'n1', kind: 'note', rect: r(0, 100, 160, 120) },
    { id: 'fld_1', kind: 'folder', rect: r(180, 100, 160, 120) },
    { id: 'n2', kind: 'note', rect: r(200, 110, 60, 60) },   // 叠在文件夹里侧的小卡
  ]

  it('空白处落手返回 null（只回弹，不合并）', () => {
    expect(pickTarget(50, 500, targets, 'n1')).toBeNull()
  })

  it('命中矩形内的目标；多重命中取面积最小者（更具体的优先）', () => {
    expect(pickTarget(60, 150, targets)).toBe('n1')
    expect(pickTarget(220, 130, targets)).toBe('n2')      // 落在 n2 与文件夹的重叠里，取小的 n2
    expect(pickTarget(190, 200, targets)).toBe('fld_1')   // 只命中文件夹
  })

  it('拖拽源自己永远不是落点', () => {
    expect(pickTarget(60, 150, targets, 'n1')).toBeNull()
    expect(pickTarget(60, 150, targets, 'n2')).toBe('n1')
  })

  it('安全区夹取：卡片不许被拖进顶部工具区或底部导航之下', () => {
    expect(clampToSafe(20, 100, 600)).toBe(100)
    expect(clampToSafe(900, 100, 600)).toBe(600)
    expect(clampToSafe(300, 100, 600)).toBe(300)
    /* 小屏上安全区可能倒挂（导航顶边高于工具区底边）——此时取上沿，绝不产生负高度区间 */
    expect(clampToSafe(500, 600, 400)).toBe(600)
  })

  it('长按门槛是显式常量（改这两个值会直接改手感，测试把它们钉住）', () => {
    expect(HOLD_MS).toBeGreaterThanOrEqual(300)
    expect(HOLD_MS).toBeLessThanOrEqual(450)
    expect(MOVE_TOL).toBeGreaterThan(0)
    expect(MOVE_TOL).toBeLessThan(20)
  })
})
