import Chip from '@mui/material/Chip'
import CheckRounded from '@mui/icons-material/CheckRounded'
import type { PendingOp } from '../lib/sync-queue'
import { effectiveStatus } from '../lib/tasks'
import type { DailyTask } from '../types/db'

interface Props {
  tasks: DailyTask[]
  queue: PendingOp[]
}

export function MinimalStandards({ tasks, queue }: Props) {
  if (tasks.length === 0) return null

  const doneCount = tasks.filter((t) => effectiveStatus(t, queue) === 'done').length

  return (
    <section
      aria-label="每日最低标准"
      className="glass-card rounded-2xl p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">每日最低标准</h2>
        <Chip
          label={`${doneCount}/${tasks.length}`}
          size="small"
          sx={{
            fontSize: 11,
            height: 22,
            bgcolor: 'var(--tw-overlay-2)',
            color: 'var(--muted-foreground)',
            fontVariantNumeric: 'tabular-nums',
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {tasks.map((t) => {
          const done = effectiveStatus(t, queue) === 'done'
          return (
            <Chip
              key={t.id}
              label={t.title}
              size="small"
              icon={done ? <CheckRounded sx={{ fontSize: 16 }} /> : undefined}
              sx={{
                fontSize: 12,
                maxWidth: '100%',
                height: 28,
                borderRadius: '999px',
                transition: 'all 0.12s cubic-bezier(0.4,0,0.2,1)',
                '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
                ...(done
                  ? {
                      bgcolor: 'var(--green-accent)',
                      color: '#0a0a0a',
                      '& .MuiChip-icon': { color: '#0a0a0a' },
                    }
                  : {
                      borderColor: 'var(--tw-border-l1)',
                      color: 'var(--muted-foreground)',
                      bgcolor: 'var(--glass-bg)',
                    }),
              }}
            />
          )
        })}
      </div>
    </section>
  )
}
