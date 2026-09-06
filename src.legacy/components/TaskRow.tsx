import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { formatTime } from '../lib/dates'
import { CATEGORY_META } from '../lib/categories'
import type { DailyTask } from '../types/db'
import { CategoryIcon } from './CategoryIcon'

interface Props {
  task: DailyTask
  done: boolean
  /** 该任务有待同步操作，禁止再次切换 */
  disabled?: boolean
  onToggle: (task: DailyTask, nextDone: boolean) => void
}

export function TaskRow({ task, done, disabled = false, onToggle }: Props) {
  const [expanded, setExpanded] = useState(false)
  const reduce = useReducedMotion()
  const springCheck = { type: 'spring' as const, stiffness: 350, damping: 30 }
  const springNotes = { type: 'spring' as const, stiffness: 300, damping: 32 }

  return (
    <li className="border-b border-[var(--tw-border-l1)] last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-3 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[var(--tw-overlay-1)]">
        <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-[var(--muted-foreground)]">
          {formatTime(task.time_of_day) || '—'}
        </span>

        <span
          aria-hidden
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${CATEGORY_META[task.category].chip}`}
        >
          <CategoryIcon category={task.category} className="size-[18px]" />
        </span>

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={`${task.title}详情`}
        >
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate text-[15px] font-medium leading-6 transition-all duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                done ? 'text-[var(--muted-foreground)] line-through' : 'text-[var(--foreground)]'
              }`}
            >
              {task.title}
            </span>
            {task.is_minimum_standard && (
              <span className="mt-0.5 inline-flex rounded-full bg-[var(--amber-accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--amber-text)]">
                最低标准
              </span>
            )}
          </span>
          {task.notes && (
            <svg
              viewBox="0 0 16 16"
              className={`size-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          )}
        </button>

        <motion.button
          type="button"
          whileTap={reduce || disabled ? undefined : { scale: 0.88 }}
          onClick={() => onToggle(task, !done)}
          disabled={disabled}
          aria-label={`${done ? '撤销完成' : '完成'}：${task.title}`}
          aria-pressed={done}
          className={`flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
            done
              ? 'border-transparent bg-[var(--green-accent)] text-[#0a0a0a]'
              : 'border-[var(--tw-border-l2)] bg-[var(--glass-bg)] active:border-[var(--tw-border-l3)]'
          } ${disabled ? 'opacity-50' : ''}`}
        >
          <AnimatePresence initial={false}>
            {done && (
              <motion.svg
                key="check"
                viewBox="0 0 24 24"
                className="size-5"
                initial={reduce ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                transition={springCheck}
                aria-hidden
              >
                <path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && task.notes && (
          <motion.div
            key="notes"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0.15 } : springNotes}
            className="overflow-hidden"
          >
            <p className="mx-4 mb-3 rounded-xl bg-[var(--tw-overlay-2)] px-3.5 py-2.5 text-[13px] leading-5 text-[var(--muted-foreground)]">
              {task.notes}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}
