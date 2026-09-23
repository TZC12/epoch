import { describe, expect, it } from 'vitest'
import { remoteNoteSlices } from '@/services/sync'
import { pruneFolders } from '@/services/folders'

/**
 * 备忘成组关系上云（0007）后的回填收口。
 * 关键点不是"能不能读回来"，而是云端只 upsert、不传播删除——
 * 新设备第一次回填时，云端残留的空夹必须按本机同一条规则解散掉。
 */

const row = (id: string, folder_id: string | null = null, tags: unknown = []) =>
  ({ id, title: `备忘${id}`, body: '', tags, pinned: false, folder_id, created_at: 'c1', updated_at: 'u1' })
const frow = (id: string) => ({ id, user_id: 'u', title: `夹${id}`, created_at: 'c1' })

describe('remoteNoteSlices（云端 notes + note_folders → 本机切片）', () => {
  it('成员够数的夹正常回填，folderId 原样带回来', () => {
    const s = remoteNoteSlices([row('a', 'f1'), row('b', 'f1'), row('c')], [frow('f1')])
    expect(s.noteFolders.map((f) => f.id)).toEqual(['f1'])
    expect(s.noteFolders[0].title).toBe('夹f1')
    expect(s.notes.map((n) => n.folderId)).toEqual(['f1', 'f1', null])
  })

  it('云端只剩 1 个成员的残留夹：夹解散、那张卡回散卡', () => {
    const s = remoteNoteSlices([row('a', 'f1'), row('b')], [frow('f1')])
    expect(s.noteFolders).toHaveLength(0)
    expect(s.notes.find((n) => n.id === 'a')!.folderId).toBeNull()
  })

  it('folder_id 指向云端已不存在的夹：悬空引用洗成 null，别的卡不受影响', () => {
    const s = remoteNoteSlices([row('a', 'ghost'), row('b', 'f1'), row('c', 'f1')], [frow('f1')])
    expect(s.notes.find((n) => n.id === 'a')!.folderId).toBeNull()
    expect(s.notes.find((n) => n.id === 'b')!.folderId).toBe('f1')
    expect(s.noteFolders.map((f) => f.id)).toEqual(['f1'])
  })

  it('note_folders 表还没建（0007 未执行）：等价于全部散卡，不报错', () => {
    const s = remoteNoteSlices([row('a'), row('b')], [])
    expect(s.noteFolders).toEqual([])
    expect(s.notes.every((n) => n.folderId === null)).toBe(true)
  })

  it('tags 不是数组时兜底空数组，pinned/body/时间照常映射', () => {
    const s = remoteNoteSlices([{ ...row('a'), tags: null, pinned: 1 }], [])
    expect(s.notes[0].tags).toEqual([])
    expect(s.notes[0].pinned).toBe(true)
    expect(s.notes[0].createdAt).toBe('c1')
  })
})

describe('pruneFolders（三个调用方共用的唯一规则）', () => {
  const note = (id: string, folderId: string | null) =>
    ({ id, title: id, body: '', tags: [], pinned: false, folderId, createdAt: 'c', updatedAt: 'u' })
  const folder = (id: string) => ({ id, title: id, createdAt: 'c' })

  it('已经合规的状态原样返回同一引用（不制造新对象）', () => {
    const s = { notes: [note('a', 'f1'), note('b', 'f1')], noteFolders: [folder('f1')] }
    expect(pruneFolders(s)).toBe(s)
  })

  it('悬空引用单独出现：只洗那一张，合格夹与它的成员不动', () => {
    const s = { notes: [note('a', 'f1'), note('b', 'f1'), note('c', 'ghost')], noteFolders: [folder('f1')] }
    const out = pruneFolders(s)
    expect(out.noteFolders.map((f) => f.id)).toEqual(['f1'])
    expect(out.notes.map((n) => n.folderId)).toEqual(['f1', 'f1', null])
    expect(s.notes[2].folderId).toBe('ghost') // 不改动入参
  })

  it('夹掉到 1 个成员 + 另一张卡悬空：两件事一次处理完', () => {
    const s = { notes: [note('a', 'f1'), note('c', 'ghost')], noteFolders: [folder('f1')] }
    const out = pruneFolders(s)
    expect(out.noteFolders).toHaveLength(0)
    expect(out.notes.every((n) => n.folderId === null)).toBe(true)
  })
})
