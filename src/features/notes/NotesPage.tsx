import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pin, PinOff, Search, StickyNote, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Field, Textarea } from '@/components/ui/Field'
import { TokenField } from '@/components/ui/TokenField'
import { useFieldErr } from '@/lib/useFieldErr'
import { IconButton } from '@/components/ui/IconButton'
import { Sheet } from '@/components/ui/Sheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { ProjectFolder } from '@/components/motion/project-folder'
import { useData } from '@/services/store'
import { useNoteTags } from '@/services/queries'
import {
  createNote, updateNote, deleteNote, restoreNote,
  mergeNotes, ejectNote, undoGroup, type NotesGroupUndo,
} from '@/services/actions'
import { addDaysKey, todayKey } from '@/lib/dates'
import type { NoteItem } from '@/services/types'
import { useNoteDrag, type DropTarget } from './use-note-drag'
import '@/features/today/home.css'
import './notes-page.css'

/** 编辑 sheet：null=关闭；'new'=新建；NoteItem=编辑。 */
function NoteEditor({ target, onClose }: { target: NoteItem | 'new' | null; onClose: () => void }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const editing = target !== null && target !== 'new' ? target : null
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    if (target === null) return
    if (editing) { setTitle(editing.title); setBody(editing.body); setTags(editing.tags); setPinned(editing.pinned) }
    else { setTitle(''); setBody(''); setTags([]); setPinned(false) }
  }, [target, editing])

  const titleErr = useFieldErr()
  const onSave = (): void => {
    if (!title.trim()) { titleErr.fire(t('common.needTitle')); return }
    if (editing) { updateNote(editing.id, { title: title.trim(), body, tags, pinned }) }
    else { createNote({ title, body, tags, pinned }) }
    toast(t('common.saved'), { tone: 'success' })
    onClose()
  }
  const onDelete = (): void => {
    if (!editing) return
    const snap = deleteNote(editing.id)
    if (snap) toast(t('common.deleted'), { action: { label: t('common.undo'), onClick: () => restoreNote(snap.item, snap.index) } })
    onClose()
  }

  return (
    <Sheet open={target !== null} onClose={onClose} title={editing ? t('notes.edit') : t('notes.new')} tall
      footer={
        <div className="notes-edit__acts">
          {editing && <Button variant="danger-text" onClick={onDelete}>{t('common.delete')}</Button>}
          <Button variant="quiet" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={onSave}>{t('common.save')}</Button>
        </div>
      }
    >
      <div className="notes-edit">
        {/* 编辑弹层是「打开即写」的场景， autofocus 与 TaskSheet/RoutineSheet/GoalSheet 同口径 */}
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <Field label={t('notes.titleField')} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus error={titleErr.err ?? undefined} shakeKey={titleErr.shakeKey} />
        <Textarea label={t('notes.bodyField')} value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
        <TokenField label={t('notes.tagLabel')} value={tags} onChange={setTags} placeholder={t('notes.tagPlaceholder')} hint={t('notes.tagHint')} />
        <Chip on={pinned} onClick={() => setPinned(!pinned)}>
          {pinned ? <PinOff size={14} aria-hidden="true" /> : <Pin size={14} aria-hidden="true" />}
          {' '}{pinned ? t('notes.unpin') : t('notes.pin')}
        </Chip>
      </div>
    </Sheet>
  )
}

/**
 * NotesPage（概念稿 page5）：搜索 + 标签 chips + 文件夹 / PINNED / 按日分组 + 编辑 sheet（删除带撤销）。
 *
 * 卡片长按可拖（use-note-drag）：拖到另一张卡上即两两成组，拖到文件夹上即加入，
 * 少于 2 个成员的文件夹由 actions 自动解散——所以界面上不会出现空文件夹。
 */
export default function NotesPage() {
  const { t, i18n } = useTranslation()
  const zh = i18n.language.startsWith('zh')
  const notesAll = useData((s) => s.notes)
  const foldersAll = useData((s) => s.noteFolders)
  const tags = useNoteTags()
  const { toast } = useToast()
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [target, setTarget] = useState<NoteItem | 'new' | null>(null)
  const [openFolder, setOpenFolder] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return notesAll.filter((n) => {
      if (tag !== null && !n.tags.includes(tag)) return false
      if (!kw) return true
      return n.title.toLowerCase().includes(kw) || n.body.toLowerCase().includes(kw)
    })
  }, [notesAll, q, tag])

  /* 文件夹成员跟着筛选走：筛到只剩 1 条时该夹在这一屏里就地摊平（只影响视图，不动数据） */
  const folders = useMemo(() => {
    const byFolder = new Map<string, NoteItem[]>()
    for (const n of filtered) if (n.folderId) {
      const arr = byFolder.get(n.folderId)
      if (arr) arr.push(n); else byFolder.set(n.folderId, [n])
    }
    return foldersAll
      .map((f) => ({ folder: f, members: byFolder.get(f.id) ?? [] }))
      .filter((x) => x.members.length >= 2)
  }, [foldersAll, filtered])

  const folderMemberIds = useMemo(() => new Set(folders.flatMap((f) => f.members.map((m) => m.id))), [folders])
  const loose = useMemo(() => filtered.filter((n) => !n.folderId || !folderMemberIds.has(n.id)), [filtered, folderMemberIds])
  const pinnedNotes = loose.filter((n) => n.pinned)
  const groups = useMemo(() => {
    const today = todayKey()
    const yest = addDaysKey(today, -1)
    const m = new Map<string, NoteItem[]>()
    for (const n of loose.filter((x) => !x.pinned)) {
      const d = n.updatedAt.slice(0, 10)
      const key = d === today ? 'today' : d === yest ? 'yesterday' : d
      const arr = m.get(key)
      if (arr) arr.push(n); else m.set(key, [n])
    }
    return [...m.entries()].sort((a, b) => {
      const rank = (k: string) => (k === 'today' ? 2 : k === 'yesterday' ? 1 : 0)
      return rank(b[0]) - rank(a[0]) || b[0].localeCompare(a[0])
    })
  }, [loose])

  const dayLabel = (k: string): string => {
    if (k === 'today') return t('notes.groupToday')
    if (k === 'yesterday') return t('notes.groupYesterday')
    const d = new Date(`${k}T12:00:00`)
    return zh ? `${d.getMonth() + 1}月${d.getDate()}日` : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  /* ── 拖拽：落点矩形每次现取（滚动/重排后坐标会变，缓存必错） ── */
  const cells = useRef(new Map<string, HTMLElement>())
  const register = useCallback((id: string, el: HTMLElement | null): void => {
    if (el) cells.current.set(id, el); else cells.current.delete(id)
  }, [])
  const collect = useCallback((): DropTarget[] =>
    [...cells.current.entries()].map(([id, el]) => ({
      id, kind: id.startsWith('fld_') ? 'folder' as const : 'note' as const, rect: el.getBoundingClientRect(),
    })), [])
  const chrome = useRef<HTMLDivElement>(null)
  const safeTop = useCallback(() => chrome.current?.getBoundingClientRect().bottom ?? 0, [])
  /* 底部让开悬浮胶囊导航；桌面（≥1024）没有胶囊，让开视口下沿即可 */
  const safeBottom = useCallback(() => {
    const bar = document.querySelector<HTMLElement>('.app-tabbar')
    const top = bar ? bar.getBoundingClientRect().top : window.innerHeight
    return top - 8
  }, [])

  const onDrop = useCallback((draggedId: string, targetId: string | null): void => {
    const note = useData.getState().notes.find((n) => n.id === draggedId)
    if (!note) return
    let undo: NotesGroupUndo | null = null
    if (targetId) {
      /* 落在文件夹上 → 用该夹的任一成员当合并对象（mergeNotes 认的是"目标所在的夹"，不是具体哪张） */
      const hit = targetId.startsWith('fld_')
        ? useData.getState().notes.find((n) => n.folderId === targetId)
        : useData.getState().notes.find((n) => n.id === targetId)
      if (!hit || hit.id === draggedId) return
      undo = mergeNotes(draggedId, hit.id)
      /* let 变量在闭包里不会被 TS 收窄，先落成 const 再交给撤销按钮 */
      if (undo) { const u = undo; toast(t('notes.merged'), { action: { label: t('common.undo'), onClick: () => undoGroup(u) } }) }
      return
    }
    if (note.folderId) {
      undo = ejectNote(draggedId)
      if (undo) { const u = undo; toast(t('notes.ejected'), { action: { label: t('common.undo'), onClick: () => undoGroup(u) } }) }
    }
  }, [toast, t])

  const { drag, armedId, begin } = useNoteDrag({ collect, onDrop, safeTop, safeBottom })

  /* 长按起拖后不能让它同时算成一次点击：捕获阶段掐掉这一下 click */
  useEffect(() => {
    if (!armedId) return
    const swallow = (e: MouseEvent) => { e.stopPropagation(); e.preventDefault() }
    window.addEventListener('click', swallow, true)
    return () => window.removeEventListener('click', swallow, true)
  }, [armedId])

  const dragProps = (id: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => begin(e, id),
    'data-drag': drag?.id === id ? 'on' : undefined,
    'data-drop': drag?.over === id ? 'on' : undefined,
    style: drag?.id === id
      ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.03)` }
      : undefined,
  })

  return (
    <div className="notes">
      <header className="home-head">
        <div className="home-head__col">
          <span className="eyebrow">{t('notes.eyebrow')} · {notesAll.length}</span>
          <h1 className="t-h1">{t('notes.title')}</h1>
        </div>
        <IconButton icon={<Plus size={20} aria-hidden="true" />} label={t('notes.new')} onClick={() => setTarget('new')} />
      </header>

      <div className="notes-chrome" ref={chrome}>
        <div className="notes-search">
          <Search size={16} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('notes.search')} aria-label={t('notes.search')} name="note-search" autoComplete="off" />
        </div>
        <div className="notes-tags">
          <Chip on={tag === null} onClick={() => setTag(null)}>{t('notes.all')}</Chip>
          {tags.map((x) => (
            <Chip key={x.tag} on={tag === x.tag} onClick={() => setTag(tag === x.tag ? null : x.tag)}>{x.tag} <span className="tnum">{x.count}</span></Chip>
          ))}
        </div>
        {filtered.length >= 2 && <p className="notes-hint t-caption">{t('notes.dragHint')}</p>}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          illustration={<StickyNote size={40} strokeWidth={1.4} aria-hidden="true" />}
          title={notesAll.length === 0 ? t('notes.empty') : t('notes.noResult')}
          action={notesAll.length === 0 ? <Button variant="quiet" onClick={() => setTarget('new')}>{t('notes.new')}</Button> : undefined}
        />
      ) : (
        <>
          {folders.length > 0 && (
            <section aria-label={t('notes.folders')}>
              <h2 className="eyebrow notes-sec-title">{t('notes.folders')}</h2>
              <div className="notes-grid">
                {folders.map(({ folder, members }) => {
                  const byId = new Map(members.map((m) => [m.id, m]))
                  const open = (m: NoteItem) => { setOpenFolder(null); setTarget(m) }
                  const eject = (m: NoteItem) => {
                    const undo = ejectNote(m.id)
                    if (!undo) return
                    const u = undo
                    toast(t('notes.ejected'), { action: { label: t('common.undo'), onClick: () => undoGroup(u) } })
                  }
                  return (
                    <div
                      key={folder.id}
                      className="note-cell note-folder"
                      ref={(el) => register(folder.id, el)}
                      data-drop={drag?.over === folder.id ? 'on' : undefined}
                    >
                      <ProjectFolder
                        title={folder.title}
                        /* countLabel 与 description 是卡脚左右两栏，不能给同一句话：
                           左边数量、右边动作提示。官方 description 默认值是英文 "Updated recently"，
                           不传就会漏一句英文进中文界面。 */
                        countLabel={t('notes.folderSub', { n: members.length })}
                        description={t('notes.folderBrowse')}
                        count={members.length}
                        itemLabel={t('notes.itemWord')}
                        ariaLabel={t('notes.folderAria', { title: folder.title, n: members.length })}
                        expanded={openFolder === folder.id}
                        onExpandedChange={(v) => setOpenFolder(v ? folder.id : null)}
                        /* 官方块是固定 w-72(288px)，我们的两列格子只有约 230px——
                           不改本体，用官方留的 className 入口把宽度换成随格子走（twMerge 会替掉 w-72）。 */
                        className="w-full max-w-72"
                        /* 扇形在触发按钮内部，只给静态预览；带按钮的完整卡走展开层专用槽 */
                        previews={members.map((m) => ({ id: m.id, content: <NoteMini n={m} /> }))}
                        overlayItem={(p) => {
                          const m = byId.get(p.id)
                          return m ? <NoteMini n={m} interactive onOpen={() => open(m)} onEject={() => eject(m)} /> : p.content
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {pinnedNotes.length > 0 && (
            <section aria-label={t('notes.pinned')}>
              <h2 className="eyebrow notes-sec-title">{t('notes.pinned')}</h2>
              <div className="notes-grid">
                {pinnedNotes.map((n) => <NoteCell key={n.id} n={n} register={register} dragProps={dragProps(n.id)} onOpen={() => setTarget(n)} />)}
              </div>
            </section>
          )}
          {groups.map(([key, items]) => (
            <section key={key} aria-label={dayLabel(key)}>
              <h2 className="eyebrow notes-sec-title">{dayLabel(key)}</h2>
              <div className="notes-grid">
                {items.map((n) => <NoteCell key={n.id} n={n} register={register} dragProps={dragProps(n.id)} onOpen={() => setTarget(n)} />)}
              </div>
            </section>
          ))}
        </>
      )}

      <NoteEditor target={target} onClose={() => setTarget(null)} />
    </div>
  )
}

/**
 * 一格 = 外层 .note-cell（负责占位与命中矩形）+ 内层卡片（负责被拖走）。
 * 拖拽只动内层的 transform，所以格子永远留在原地——那就是"安全位置"：
 * 拖拽期间布局不塌、不重排，松手没成组时卡片原样落回同一个格子。
 */
function NoteCell({ n, register, dragProps, onOpen }: {
  n: NoteItem
  register: (id: string, el: HTMLElement | null) => void
  dragProps: Record<string, unknown>
  onOpen: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="note-cell" ref={(el) => register(n.id, el)}>
      <button type="button" className="note-card" onClick={onOpen} {...dragProps}>
        <span className="note-card__title t-small">{n.title}</span>
        {n.body && <span className="note-card__body t-caption">{n.body}</span>}
        <span className="note-card__foot">
          <span className={`note-card__tag${n.tags.length ? '' : ' note-card__tag--none'}`}>
            {n.tags.length ? `#${n.tags[0]}${n.tags.length > 1 ? ` +${n.tags.length - 1}` : ''}` : t('notes.uncategorized')}
          </span>
          {n.pinned && <Pin size={14} aria-hidden="true" />}
        </span>
      </button>
    </div>
  )
}

/**
 * 成员缩略卡。同一个组件两种场合：
 *  - 扇形预览（interactive 关）——它渲染在文件夹触发 <button> 内部，绝不能带任何可交互元素；
 *  - 展开层（interactive 开）——独立 dialog 里，给「打开 / 移出」两个动作。
 */
function NoteMini({ n, interactive, onOpen, onEject }: {
  n: NoteItem
  interactive?: boolean
  onOpen?: () => void
  onEject?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="folder-mini">
      <span className="folder-mini__title t-small">{n.title}</span>
      {n.body && <span className="folder-mini__body t-caption">{n.body}</span>}
      {interactive && (
        <span className="folder-mini__acts">
          <button type="button" className="folder-mini__btn" onClick={onOpen}>
            <ArrowUpRight size={14} aria-hidden="true" />{t('notes.open')}
          </button>
          <button type="button" className="folder-mini__btn" onClick={onEject}>{t('notes.eject')}</button>
        </span>
      )}
    </div>
  )
}
