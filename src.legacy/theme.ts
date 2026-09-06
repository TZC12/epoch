import { createTheme } from '@mui/material/styles'

type ThemeMode = 'light' | 'dark'

/**
 * Epoch 设计系统主题： monochrome 黑白画布 + 单点绿色强调 + 毛玻璃卡片。
 * 与 .design_library/ledgerix 的 CSS variables 同源，支持 light / dark 双模式。
 * 动画时长与过渡曲线借鉴 TraeWork 设计系统（0.12s ease 微交互）。
 */
export function getTheme(mode: ThemeMode = 'light') {
  const isDark = mode === 'dark'

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#ffffff' : '#111111',
        contrastText: isDark ? '#0a0a0a' : '#ffffff',
      },
      success: {
        main: '#4ade80',
        contrastText: '#0a0a0a',
      },
      error: {
        main: '#ef4444',
        contrastText: '#ffffff',
      },
      warning: {
        main: '#f59e0b',
      },
      text: {
        primary: isDark ? '#f5f5f5' : '#111111',
        secondary: isDark ? '#a3a3a3' : '#6b7280',
        disabled: isDark ? '#737373' : '#9ca3af',
      },
      background: {
        default: isDark ? '#0a0a0a' : '#f5f5f7',
        paper: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)',
      },
      divider: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(115,115,115,0.12)',
    },
    shape: {
      borderRadius: 16,
    },
    typography: {
      fontFamily: [
        "'Urbanist'",
        '-apple-system',
        'BlinkMacSystemFont',
        "'SF Pro Text'",
        "'PingFang SC'",
        "'HarmonyOS Sans SC'",
        "'MiSans'",
        "'Noto Sans SC'",
        "'Microsoft YaHei'",
        "'Segoe UI'",
        'Roboto',
        'sans-serif',
      ].join(','),
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDark ? '#0a0a0a' : '#f5f5f7',
            color: isDark ? '#f5f5f5' : '#111111',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 12,
            paddingInline: 20,
            transition: 'background 0.12s cubic-bezier(0.4,0,0.2,1), color 0.12s cubic-bezier(0.4,0,0.2,1), border-color 0.12s cubic-bezier(0.4,0,0.2,1), opacity 0.12s cubic-bezier(0.4,0,0.2,1)',
            '&:active': { opacity: 0.8 },
            '&.MuiButton-containedPrimary': {
              backgroundColor: isDark ? '#ffffff' : '#111111',
              color: isDark ? '#0a0a0a' : '#ffffff',
              '&:hover': {
                backgroundColor: isDark ? '#e5e5e5' : '#333333',
              },
            },
          },
          sizeLarge: {
            height: 48,
            fontSize: '0.9375rem',
          },
          sizeMedium: {
            height: 44,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            transition: 'background 0.12s cubic-bezier(0.4,0,0.2,1), color 0.12s cubic-bezier(0.4,0,0.2,1)',
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          fullWidth: true,
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(115,115,115,0.04)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(115,115,115,0.12)',
            transition: 'background 0.12s cubic-bezier(0.4,0,0.2,1), border-color 0.12s cubic-bezier(0.4,0,0.2,1)',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(115,115,115,0.06)',
              borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(115,115,115,0.18)',
            },
            '&.Mui-focused': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
              borderColor: isDark ? '#ffffff' : '#111111',
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: isDark ? '#a3a3a3' : '#6b7280',
            transition: 'color 0.12s cubic-bezier(0.4,0,0.2,1)',
            '&.Mui-focused': {
              color: isDark ? '#f5f5f5' : '#111111',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            transition: 'background 0.12s cubic-bezier(0.4,0,0.2,1), color 0.12s cubic-bezier(0.4,0,0.2,1)',
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#ffffff' : '#111111',
            color: isDark ? '#0a0a0a' : '#ffffff',
            boxShadow: isDark
              ? '0 8px 24px rgba(255,255,255,0.12)'
              : '0 8px 24px rgba(0,0,0,0.12)',
            transition: 'background 0.12s cubic-bezier(0.4,0,0.2,1), box-shadow 0.12s cubic-bezier(0.4,0,0.2,1)',
            '&:hover': {
              backgroundColor: isDark ? '#e5e5e5' : '#333333',
            },
            '&:active': {
              opacity: 0.85,
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            backgroundColor: isDark ? 'rgba(13,13,13,0.92)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(28px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            width: 44,
            height: 26,
            padding: 2,
          },
          switchBase: {
            padding: 2,
            '&.Mui-checked': {
              color: '#ffffff',
              '& + .MuiSwitch-track': {
                backgroundColor: '#4ade80',
                opacity: 1,
              },
            },
          },
          thumb: {
            width: 22,
            height: 22,
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'transform 0.16s cubic-bezier(0.4,0,0.2,1)',
          },
          track: {
            borderRadius: 13,
            backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(115,115,115,0.16)',
            opacity: 1,
            transition: 'background 0.16s cubic-bezier(0.4,0,0.2,1)',
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 500,
            borderColor: 'transparent',
            color: isDark ? '#a3a3a3' : '#6b7280',
            transition: 'background 0.12s cubic-bezier(0.4,0,0.2,1), color 0.12s cubic-bezier(0.4,0,0.2,1)',
            '&.Mui-selected': {
              backgroundColor: isDark ? '#ffffff' : '#111111',
              color: isDark ? '#0a0a0a' : '#ffffff',
            },
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            gap: 6,
          },
          grouped: {
            border: 'none',
            margin: 0,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            backgroundColor: isDark ? 'rgba(20,20,20,0.95)' : 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(28px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(115,115,115,0.12)'}`,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(20px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(115,115,115,0.12)'}`,
            boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04), inset 0 0.5px 0 rgba(255,255,255,0.4)',
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(115,115,115,0.12)',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            transition: 'background 0.12s cubic-bezier(0.4,0,0.2,1)',
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            transition: 'background 0.12s cubic-bezier(0.4,0,0.2,1)',
          },
        },
      },
    },
  })
}

export default getTheme
