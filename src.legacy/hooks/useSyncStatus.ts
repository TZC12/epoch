import { useEffect, useState } from 'react'
import { syncQueue, type PendingOp, type SyncStatus } from '../lib/sync-queue'

export function useSyncStatus(): { status: SyncStatus; queue: PendingOp[] } {
  const [state, setState] = useState<{ status: SyncStatus; queue: PendingOp[] }>(() => ({
    status: syncQueue.getStatus(),
    queue: syncQueue.getQueue(),
  }))

  useEffect(() => syncQueue.subscribe((status, queue) => setState({ status, queue })), [])

  return state
}
