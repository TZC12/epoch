import { useId, useRef, useState } from 'react'
import type { KeyboardEvent, ClipboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { normalizeTags } from '@/services/actions'
import './token-field.css'

/**
 * Token Field（NSTokenField 的 Web 等价物）：输入被识别出的每个值变成字段内
 * 可单独选中/编辑/删除的圆胶囊，而不是把整段当纯文本。
 * 交互映射：输入 + Enter/,/，/、 生成胶囊；退格（输入框空）先选中末位、再按删除；
 * 点胶囊=选中，再点=删除，双击=拉回输入框改写；Esc 取消选中；粘贴按分隔符拆多枚。
 * 值始终由外层受控（onChange 收到规范化后的数组），组件不自己存重复态。
 */
export function TokenField({ label, value, onChange, placeholder, hint, max = 12 }: {
  label?: string
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  hint?: string
  max?: number
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')
  const [sel, setSel] = useState<number | null>(null)
  const [focus, setFocus] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()

  const commit = (raw: string): void => {
    /* 分隔符一并切开：逐字输入时 keydown 已拦，但自动纠正/中文输入法上屏、
       以及带逗号的整串粘贴都会走到这里，不能把「A,B」当成一枚标签 */
    const next = normalizeTags([...value, ...raw.split(/[,，、;\n]/)])
    if (next.length > max) { onChange(next.slice(0, max)); setDraft(''); return }
    onChange(next)
    setDraft('')
    setSel(null)
  }
  const removeAt = (i: number): void => {
    onChange(value.filter((_, idx) => idx !== i))
    setSel(null)
    inputRef.current?.focus()
  }
  /* 把胶囊拉回输入框改写（NSTokenField 的编辑态） */
  const editAt = (i: number): void => {
    setDraft(value[i])
    onChange(value.filter((_, idx) => idx !== i))
    setSel(null)
    inputRef.current?.focus()
  }
  const onTokenClick = (i: number): void => {
    if (sel === i) removeAt(i)
    else { setSel(i); inputRef.current?.focus() }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') { e.preventDefault(); if (draft.trim()) commit(draft); return }
    if (e.key === ',' || e.key === '，' || e.key === '、' || e.key === ';') {
      if (draft.trim()) { e.preventDefault(); commit(draft) }
      return
    }
    if (e.key === 'Escape') { setSel(null); return }
    if (e.key === 'Backspace' && draft === '') {
      e.preventDefault()
      if (value.length === 0) return
      if (sel === null) setSel(value.length - 1)
      else removeAt(sel)
      return
    }
    if (e.key === 'Delete' && sel !== null) { e.preventDefault(); removeAt(sel) }
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>): void => {
    const text = e.clipboardData.getData('text')
    if (!/[,，、;\n]/.test(text)) return
    e.preventDefault()
    onChange(normalizeTags([...value, ...text.split(/[,，、;\n]/)]).slice(0, max))
    setDraft('')
  }

  return (
    <div className="field tokenfield">
      {label && <label className="field__label eyebrow" htmlFor={id}>{label}</label>}
      {/* 点框内空白处聚焦输入框：只是指针便利，键盘用户 Tab 本来就直接落到框内那个
          真输入框上，所以这里不补 role/tabIndex/键监听——加了反而多一个无意义的停靠点。 */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={`tokenfield__box${focus ? ' is-focus' : ''}`}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, i) => (
          <button
            key={`${tag}-${i}`}
            type="button"
            className={`tf__token${sel === i ? ' is-sel' : ''}`}
            aria-label={t('a11y.tagToken', { tag })}
            aria-pressed={sel === i}
            onClick={() => onTokenClick(i)}
            onDoubleClick={() => editAt(i)}
          >
            <span className="tf__hash" aria-hidden="true">#</span>
            {tag}
            <X className="tf__x" size={14} aria-hidden="true" />
          </button>
        ))}
        <input
          ref={inputRef}
          id={id}
          className="tokenfield__input"
          value={draft}
          placeholder={value.length === 0 ? placeholder : ''}
          onChange={(e) => { setDraft(e.target.value); setSel(null) }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onFocus={() => setFocus(true)}
          onBlur={() => { setFocus(false); if (draft.trim()) commit(draft) }}
          aria-label={label ?? placeholder}
        />
      </div>
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  )
}
