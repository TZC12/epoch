import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Chip from '@mui/material/Chip'
import { subscribeToasts, type ToastItem } from '../lib/toast'

const toneColor: Record<ToastItem['tone'], 'success' | 'error' | 'default' | 'primary'> = {
  success: 'success',
  error: 'error',
  info: 'default',
  sync: 'primary',
}

/** Toast 宿主：MUI Chip 药丸 + motion 弹簧进出场 */
export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([])
  useEffect(() => subscribeToasts(setItems), [])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-60 flex flex-col items-center gap-2 px-4 pt-3">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 350, damping: 32 }}
            role="status"
          >
            <Chip
              label={t.message}
              color={toneColor[t.tone]}
              sx={{
                borderRadius: 999,
                px: 1,
                fontWeight: 600,
                fontSize: 14,
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                border: '1px solid var(--tw-border-l1)',
                backdropFilter: 'blur(20px) saturate(1.8)',
                WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
