import type { ReactNode } from 'react'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import CloseRounded from '@mui/icons-material/CloseRounded'
import { cardSxStrong } from '../lib/cardSx'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** 底部弹层：MUI Drawer（自带滑入过渡、滚动锁定、Esc 关闭） */
export function BottomSheet({ open, onClose, title, children }: Props) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      aria-label={title}
      slotProps={{
        paper: {
          sx: {
            ...cardSxStrong,
            maxWidth: 430,
            mx: 'auto',
            maxHeight: '86dvh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 8px 32px rgba(0,0,0,0.06), inset 0 0.5px 0 rgba(255,255,255,0.4)',
          },
        },
      }}
    >
      <div className="sticky top-0 z-10 border-b border-[var(--tw-border-l1)] bg-[var(--glass-bg-strong)] px-5 pb-3 pt-3 backdrop-blur-[28px] backdrop-saturate-[1.8]">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-[var(--tw-border-l3)]" aria-hidden />
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--foreground)]">{title}</h2>
          <IconButton
            onClick={onClose}
            aria-label="关闭"
            size="small"
            sx={{
              color: 'var(--muted-foreground)',
              bgcolor: 'var(--tw-overlay-2)',
              '&:hover': { bgcolor: 'var(--tw-overlay-3)' },
            }}
          >
            <CloseRounded sx={{ fontSize: 18 }} />
          </IconButton>
        </div>
      </div>
      <div
        className="flex-1 overflow-y-auto bg-transparent px-5 pb-8 pt-4"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
      >
        {children}
      </div>
    </Drawer>
  )
}
