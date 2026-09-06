import IconButton from '@mui/material/IconButton'
import { useThemeMode } from '../lib/theme-mode'

function ThemeIcon({ mode }: { mode: 'light' | 'dark' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {mode === 'dark' ? (
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      ) : (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </>
      )}
    </svg>
  )
}

/** 明暗主题切换按钮（页面右上角） */
export function ThemeToggleButton() {
  const { mode, toggle } = useThemeMode()

  return (
    <IconButton
      onClick={toggle}
      aria-label={mode === 'light' ? '切换到深色模式' : '切换到浅色模式'}
      sx={{
        color: 'var(--foreground)',
        bgcolor: 'var(--tw-overlay-2)',
        border: '1px solid var(--tw-border-l1)',
        '&:hover': { bgcolor: 'var(--tw-overlay-3)' },
        '&:active': { opacity: 0.7 },
        transition:
          'background 0.12s cubic-bezier(0.4,0,0.2,1), color 0.12s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <ThemeIcon mode={mode} />
    </IconButton>
  )
}
