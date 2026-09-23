import type { DataState } from './types'

/**
 * 「少于 2 个成员的文件夹不成立」这条规则的唯一实现：不合格的空夹解散、
 * 成员退回散卡；顺带清掉指向已不存在文件夹的悬空 folderId。
 *
 * 泛型只要求 notes / noteFolders 两个切片，因此三个调用方都能直接用同一套阈值：
 *  - actions.ts：拖拽合并、移出、撤销之后收口；
 *  - store.ts：persist migrate（老快照 / 半截数据）；
 *  - sync.ts：云端回填——push 只做 upsert、不传播删除，云端会残留成员已不足的夹，
 *    不重跑这条规则就会在新设备上"复活"出一个空文件夹。
 * 界面上永远不该出现空文件夹，所以这条规则也不该有第二份拷贝。
 */
export function pruneFolders<S extends Pick<DataState, 'notes' | 'noteFolders'>>(s: S): S {
  const known = new Set(s.noteFolders.map((f) => f.id))
  const counts = new Map<string, number>()
  for (const n of s.notes) {
    const id = n.folderId ?? null
    if (id && known.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const dead = new Set(s.noteFolders.filter((f) => (counts.get(f.id) ?? 0) < 2).map((f) => f.id))
  const bad = (id: string | null): boolean => id !== null && (dead.has(id) || !known.has(id))
  if (dead.size === 0 && !s.notes.some((n) => bad(n.folderId ?? null))) return s
  return {
    ...s,
    notes: s.notes.map((n) => (bad(n.folderId ?? null) ? { ...n, folderId: null } : n)),
    noteFolders: s.noteFolders.filter((f) => !dead.has(f.id)),
  }
}
