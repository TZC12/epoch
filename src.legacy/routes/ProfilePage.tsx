import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import { useSession } from '../lib/auth'
import { cardSx } from '../lib/cardSx'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'
import { useUserSettings } from '../hooks/useTemplates'
import { useMonthlyStats } from '../hooks/useMonthlyStats'
import { CompletionStats } from '../components/CompletionStats'
import { ThemeToggleButton } from '../components/ThemeToggleButton'

/** 从合成邮箱还原账号名：tzc12@users.local → tzc12；真实邮箱原样返回 */
function displayAccount(email: string | null | undefined): string {
  if (!email) return '未设置账号'
  return email.replace(/@users\.local$/, '')
}

export function ProfilePage() {
  const { session } = useSession()
  const { data: settings } = useUserSettings()
  const queryClient = useQueryClient()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const now = new Date()
  const { data: monthlyStats = [] } = useMonthlyStats(now.getFullYear(), now.getMonth())

  if (!session) return null

  async function logout() {
    await supabase.auth.signOut()
    queryClient.clear()
    toast('已退出登录', 'info')
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">我的</h1>
        <ThemeToggleButton />
      </header>

      {/* 用户信息 */}
      <Paper elevation={0} sx={[cardSx, { p: 2 }]}>
        <div className="flex items-center gap-3">
          <Avatar
            sx={{
              width: 48,
              height: 48,
              fontWeight: 600,
              fontSize: 18,
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            }}
          >
            {displayAccount(session.user.email).slice(0, 1).toUpperCase()}
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-[var(--foreground)]">
              {displayAccount(session.user.email)}
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">注册账号 · 数据仅你可见</p>
          </div>
        </div>
      </Paper>

      {/* 完成度挑战统计 */}
      <CompletionStats stats={monthlyStats} />

      {/* 偏好设置 */}
      <Paper elevation={0} sx={[cardSx, { p: 2 }]} aria-label="偏好设置">
        <p className="text-sm font-semibold text-[var(--foreground)]">偏好</p>
        <List dense disablePadding sx={{ '& .MuiListItem-root': { px: 0, py: 0.75 } }}>
          <ListItem>
            <ListItemText primary="时区" slotProps={{ primary: { sx: { fontSize: 14, color: 'var(--muted-foreground)' } } }} />
            <Box sx={{ fontSize: 14, fontWeight: 500 }}>{settings?.timezone ?? '—'}</Box>
          </ListItem>
          <Divider component="li" />
          <ListItem>
            <ListItemText primary="日历地区" slotProps={{ primary: { sx: { fontSize: 14, color: 'var(--muted-foreground)' } } }} />
            <Box sx={{ fontSize: 14, fontWeight: 500 }}>中国大陆（节假日）</Box>
          </ListItem>
          <Divider component="li" />
          <ListItem>
            <ListItemText primary="数据版本" slotProps={{ primary: { sx: { fontSize: 14, color: 'var(--muted-foreground)' } } }} />
            <Box sx={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
              v{settings?.data_version ?? 1}
            </Box>
          </ListItem>
        </List>
      </Paper>

      {/* 备份与恢复 */}
      <Paper elevation={0} sx={[cardSx, { p: 2 }]} aria-label="备份与恢复">
        <p className="text-sm font-semibold text-[var(--foreground)]">备份与恢复</p>
        <div className="mt-3 flex gap-2">
          <Button variant="outlined" disabled sx={{ flex: 1, borderRadius: 2 }}>
            导出数据
          </Button>
          <Button variant="outlined" disabled sx={{ flex: 1, borderRadius: 2 }}>
            导入数据
          </Button>
        </div>
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">第四阶段上线：完整 JSON 备份与冲突合并</p>
      </Paper>

      <Button
        fullWidth
        size="large"
        variant={confirmLogout ? 'contained' : 'outlined'}
        color="error"
        onClick={() => (confirmLogout ? logout() : setConfirmLogout(true))}
        onBlur={() => setConfirmLogout(false)}
        sx={{ borderRadius: 3 }}
      >
        {confirmLogout ? '再点一次确认退出' : '退出登录'}
      </Button>

      <p className="pb-2 text-center text-xs text-[var(--muted-foreground)]">Epoch v0.1.0 · 数据存储于你的 Supabase</p>
    </div>
  )
}
