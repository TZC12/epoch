import Chip from '@mui/material/Chip'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { syncQueue } from '../lib/sync-queue'
import { toast } from '../lib/toast'

export function SyncBadge() {
  const { status, queue } = useSyncStatus()

  if (status === 'error') {
    return (
      <Chip
        label={`重试失败(${queue.length})`}
        color="error"
        variant="outlined"
        size="small"
        onClick={() => {
          syncQueue.retry()
          toast('正在重试同步…', 'sync')
        }}
        clickable
        aria-label="同步失败，点击重试"
        sx={{ fontSize: 12 }}
      />
    )
  }

  if (status === 'syncing') {
    return (
      <Chip
        label="正在同步"
        size="small"
        sx={{
          fontSize: 12,
          bgcolor: 'var(--surface-container)',
          color: 'var(--foreground)',
          borderColor: 'var(--border)',
          '& .MuiChip-label': { display: 'flex', alignItems: 'center', gap: 6 },
        }}
        icon={
          <span aria-hidden className="ml-1.5 size-1.5 animate-pulse rounded-full bg-[var(--green-accent-dot)]" />
        }
      />
    )
  }

  return (
    <Chip
      label="已同步"
      size="small"
      variant="outlined"
      sx={{
        fontSize: 12,
        borderColor: 'var(--green-accent)',
        color: 'var(--green-text)',
        '& .MuiChip-label': { display: 'flex', alignItems: 'center', gap: 6 },
      }}
      icon={<span aria-hidden className="ml-1.5 size-1.5 rounded-full bg-[var(--green-accent-dot)]" />}
    />
  )
}
