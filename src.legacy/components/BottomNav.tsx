import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Paper from '@mui/material/Paper'
import { Link, useLocation } from 'react-router'

interface TabIconProps {
  active: boolean
}

/** 今日图标：对勾标记 */
function TodayIcon({ active }: TabIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[24px]"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      {active && <path d="M8 12.5l2.5 2.5L16 9.5" fill="none" />}
    </svg>
  )
}

/** 计划图标：日历 */
function PlanIcon({ active }: TabIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[24px]"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17" fill="none" />
      <path d="M8 3v3M16 3v3" fill="none" />
      {active && <circle cx="8" cy="14" r="1" fill="currentColor" stroke="none" />}
      {active && <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" />}
      {active && <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" />}
    </svg>
  )
}

/** 我的图标：用户 */
function UserIcon({ active }: TabIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[24px]"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c1.5-3.5 4.2-5 7.5-5s6 1.5 7.5 5" />
    </svg>
  )
}

const TABS = [
  { to: '/', label: '今日', icon: TodayIcon },
  { to: '/plan', label: '计划', icon: PlanIcon },
  { to: '/profile', label: '我的', icon: UserIcon },
]

export function BottomNav() {
  const { pathname } = useLocation()

  return (
    <Paper
      component="nav"
      aria-label="主导航"
      elevation={0}
      square
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        bgcolor: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
        borderTop: '1px solid',
        borderColor: 'var(--tw-border-l1)',
        boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.4)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <Box
        sx={{
          maxWidth: 430,
          mx: 'auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          px: 2,
          height: 60,
        }}
      >
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
          return (
            <ButtonBase
              key={to}
              component={Link}
              to={to}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
                transition: 'color 0.12s cubic-bezier(0.4,0,0.2,1)',
                '&:hover': { bgcolor: 'var(--tw-overlay-2)' },
                '&:active': { bgcolor: 'var(--tw-overlay-3)' },
              }}
            >
              <Box
                component="span"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 28,
                  borderRadius: 999,
                  transition: 'background 0.12s cubic-bezier(0.4,0,0.2,1)',
                  ...(active && {
                    bgcolor: 'var(--tw-overlay-2)',
                  }),
                }}
              >
                <Icon active={active} />
              </Box>
              <Box
                component="span"
                sx={{
                  fontSize: 11,
                  fontWeight: active ? 600 : 500,
                  lineHeight: 1,
                  letterSpacing: '0.02em',
                }}
              >
                {label}
              </Box>
            </ButtonBase>
          )
        })}
      </Box>
    </Paper>
  )
}
