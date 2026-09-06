import type { Category } from '../types/db'

export const CATEGORY_LIST: Category[] = [
  'rhythm',
  'exercise',
  'study',
  'supplement',
  'skincare',
  'review',
]

export const CATEGORY_META: Record<Category, { label: string; dot: string; chip: string }> = {
  rhythm: { label: '节奏', dot: 'bg-[var(--neutral-400)]', chip: 'bg-[var(--surface-container)] text-[var(--muted-foreground)]' },
  exercise: { label: '运动', dot: 'bg-[var(--amber-accent-dot)]', chip: 'bg-[var(--amber-accent-soft)] text-[var(--amber-text)]' },
  study: { label: '学习', dot: 'bg-[var(--foreground)]', chip: 'bg-[var(--muted)] text-[var(--foreground)]' },
  supplement: { label: '补剂', dot: 'bg-[var(--green-accent-dot)]', chip: 'bg-[var(--green-accent-soft)] text-[var(--green-text)]' },
  skincare: { label: '护肤', dot: 'bg-[var(--red-accent-dot)]', chip: 'bg-[var(--red-accent-soft)] text-[var(--red-text)]' },
  review: { label: '复盘', dot: 'bg-[var(--blue-accent)]', chip: 'bg-[var(--blue-accent-soft)] text-[var(--blue-accent)]' },
}
