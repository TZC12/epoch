import { useState } from 'react'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Fab from '@mui/material/Fab'
import IconButton from '@mui/material/IconButton'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
import AddIcon from '@mui/icons-material/Add'
import EditOutlined from '@mui/icons-material/EditOutlined'
import {
  useDayThemes,
  useSaveTemplate,
  useSaveTheme,
  useSetTemplateEnabled,
  useTemplates,
  type TemplateInput,
} from '../hooks/useTemplates'
import { useMonthlyStats } from '../hooks/useMonthlyStats'
import { cardSx } from '../lib/cardSx'
import { CATEGORY_LIST, CATEGORY_META } from '../lib/categories'
import { formatTime, weekdayIndex } from '../lib/dates'
import type { RoutineTemplate } from '../types/db'
import { BottomSheet } from '../components/BottomSheet'
import { CategoryIcon } from '../components/CategoryIcon'
import { Calendar } from '../components/Calendar'
import { WeekdaySlider, WEEKDAY_CHARS } from '../components/WeekdaySlider'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'

function toInput(t: RoutineTemplate): TemplateInput {
  return {
    id: t.id,
    title: t.title,
    time_of_day: t.time_of_day,
    category: t.category,
    weekdays: t.weekdays,
    is_minimum_standard: t.is_minimum_standard,
    notes: t.notes,
    enabled: t.enabled,
    sort_order: t.sort_order,
  }
}

function newTemplate(weekday: number): TemplateInput {
  return {
    title: '',
    time_of_day: null,
    category: 'rhythm',
    weekdays: [weekday],
    is_minimum_standard: false,
    notes: null,
    enabled: true,
    sort_order: 1000,
  }
}

export function PlanPage() {
  const now = new Date()
  const [weekday, setWeekday] = useState(() => weekdayIndex(now))
  const { data: templates = [], isLoading } = useTemplates()
  const { data: themes = [] } = useDayThemes()
  const { data: monthlyStats = [] } = useMonthlyStats(now.getFullYear(), now.getMonth())
  const [editing, setEditing] = useState<TemplateInput | null>(null)
  const [themeOpen, setThemeOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined)

  const theme = themes.find((t) => t.weekday === weekday)?.theme ?? ''
  const filtered = templates.filter((t) => t.weekdays.includes(weekday))

  return (
    <div className="flex flex-col gap-4 px-4 pt-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">计划</h1>
        <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">模板改动只影响未来日期，历史记录不变</p>
      </header>

      {/* 日历置顶 */}
      <Calendar
        stats={monthlyStats}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      {/* 可拖拽周几滑块 */}
      <WeekdaySlider value={weekday} onChange={setWeekday} />

      {/* 当日主题 */}
      <Paper elevation={0} sx={[cardSx, { p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }]}>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium tracking-wide text-[var(--muted-foreground)]">当日主题</p>
          <p className="mt-0.5 truncate text-[15px] font-semibold text-[var(--foreground)]">
            {theme || '未设置'}
          </p>
        </div>
        <IconButton
          onClick={() => setThemeOpen(true)}
          aria-label="编辑当日主题"
          sx={{
            color: 'var(--muted-foreground)',
            bgcolor: 'var(--tw-overlay-2)',
            '&:hover': { bgcolor: 'var(--tw-overlay-3)' },
            '&:active': { opacity: 0.7 },
          }}
        >
          <EditOutlined sx={{ fontSize: 18 }} />
        </IconButton>
      </Paper>

      {/* 模板列表 */}
      <section aria-label="模板列表" className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            周{WEEKDAY_CHARS[weekday]}模板
            <span className="ml-1.5 text-xs font-normal text-[var(--muted-foreground)]">{filtered.length} 项</span>
          </h2>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="tw-skeleton h-16 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Paper elevation={0} sx={[cardSx, { p: 3, textAlign: 'center' }]}>
            <p className="text-sm font-medium text-[var(--foreground)]">这个星期几还没有模板</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">点击右下角 + 添加</p>
          </Paper>
        ) : (
          filtered.map((t) => (
            <TemplateRow key={t.id} template={t} onEdit={() => setEditing(toInput(t))} />
          ))
        )}
      </section>

      <Fab
        color="primary"
        aria-label="新建模板"
        onClick={() => setEditing(newTemplate(weekday))}
        sx={{
          position: 'fixed',
          bottom: 'calc(72px + env(safe-area-inset-bottom))',
          right: 'max(1rem, calc(50% - 215px + 1rem))',
          zIndex: 30,
        }}
      >
        <AddIcon />
      </Fab>

      {editing && <TemplateSheet input={editing} onClose={() => setEditing(null)} />}

      <ThemeSheet
        open={themeOpen}
        onClose={() => setThemeOpen(false)}
        weekday={weekday}
        initial={theme}
      />
    </div>
  )
}

function TemplateRow({ template: t, onEdit }: { template: RoutineTemplate; onEdit: () => void }) {
  const setEnabled = useSetTemplateEnabled()
  return (
    <Paper
      elevation={0}
      sx={[
        cardSx,
        {
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.75,
          transition: 'opacity 0.16s cubic-bezier(0.4,0,0.2,1)',
          opacity: t.enabled ? 1 : 0.5,
        },
      ]}
    >
      <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span
          aria-hidden
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${CATEGORY_META[t.category].chip}`}
        >
          <CategoryIcon category={t.category} className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-medium text-[var(--foreground)]">{t.title}</span>
            {t.is_minimum_standard && (
              <span className="shrink-0 rounded-full border border-[var(--amber-accent)]/20 bg-[var(--amber-accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--amber-text)]">
                最低
              </span>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
            <span className="font-medium tabular-nums">{formatTime(t.time_of_day) || '随时'}</span>
            <span aria-hidden>·</span>
            <span>{CATEGORY_META[t.category].label}</span>
            <span aria-hidden>·</span>
            <span className="truncate">
              {t.weekdays.length === 7 ? '每天' : `周${t.weekdays.map((w) => WEEKDAY_CHARS[w]).join('')}`}
            </span>
          </span>
        </span>
      </button>
      <Switch
        checked={t.enabled}
        onChange={(e) => setEnabled.mutate({ id: t.id, enabled: e.target.checked })}
        slotProps={{ input: { 'aria-label': `${t.title}启用状态` } }}
      />
    </Paper>
  )
}

function TemplateSheet({ input, onClose }: { input: TemplateInput; onClose: () => void }) {
  const save = useSaveTemplate()
  const [form, setForm] = useState<TemplateInput>(input)
  const set = <K extends keyof TemplateInput>(key: K, value: TemplateInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const valid = form.title.trim().length > 0 && form.weekdays.length > 0

  return (
    <BottomSheet open onClose={onClose} title={input.id ? '编辑模板' : '新建模板'}>
      <div className="flex flex-col gap-5">
        <TextField
          label="标题"
          placeholder="如：慢跑30分钟"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
        />

        <TextField
          label="时间（可选）"
          type="time"
          value={form.time_of_day ? form.time_of_day.slice(0, 5) : ''}
          onChange={(e) => set('time_of_day', e.target.value ? `${e.target.value}:00` : null)}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">类别</span>
          <ToggleButtonGroup
            value={form.category}
            exclusive
            onChange={(_e, v) => v !== null && set('category', v)}
            aria-label="选择类别"
            sx={{ flexWrap: 'wrap', gap: 6 }}
          >
            {CATEGORY_LIST.map((c) => (
              <ToggleButton
                key={c}
                value={c}
                aria-label={CATEGORY_META[c].label}
                sx={{
                  height: 40,
                  px: 2,
                  gap: 0.75,
                  bgcolor: 'var(--tw-overlay-2)',
                  color: 'var(--muted-foreground)',
                  fontSize: 13,
                  border: 'none',
                  '&:hover': { bgcolor: 'var(--tw-overlay-3)' },
                  '&.Mui-selected': {
                    bgcolor: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    '&:hover': { bgcolor: 'color-mix(in srgb, var(--primary) 88%, #000)' },
                  },
                }}
              >
                <CategoryIcon category={c} className="size-3.5" />
                {CATEGORY_META[c].label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">适用星期</span>
          <WeekdayPickerMulti value={form.weekdays} onChange={(v) => set('weekdays', v)} />
        </div>

        <TextField
          label="说明（可选）"
          placeholder="具体要求、内容清单…"
          multiline
          minRows={3}
          value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value.trim() || null)}
        />

        <div className="flex items-center justify-between rounded-xl bg-[var(--tw-overlay-2)] px-4 py-2">
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">每日最低标准</p>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">计入首页「每日 5 项」检查</p>
          </div>
          <FormControlLabel
            control={
              <Switch
                checked={form.is_minimum_standard}
                onChange={(e) => set('is_minimum_standard', e.target.checked)}
              />
            }
            label=""
            aria-label="设为每日最低标准"
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[var(--tw-overlay-2)] px-4 py-2">
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">启用</p>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">停用后未来日期不再生成</p>
          </div>
          <Switch checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} slotProps={{ input: { 'aria-label': '启用模板' } }} />
        </div>

        <div className="flex gap-3 pt-1">
          <Button
            variant="text"
            color="inherit"
            onClick={onClose}
            sx={{
              flex: 1,
              color: 'var(--muted-foreground)',
              bgcolor: 'var(--tw-overlay-2)',
              '&:hover': { bgcolor: 'var(--tw-overlay-3)' },
            }}
          >
            取消
          </Button>
          <Button
            variant="contained"
            disabled={!valid}
            loading={save.isPending}
            loadingPosition="start"
            onClick={() =>
              save.mutate({ ...form, title: form.title.trim() }, { onSuccess: onClose })
            }
            sx={{ flex: 2 }}
          >
            保存
          </Button>
        </div>

        <p className="text-center text-xs leading-5 text-[var(--muted-foreground)]">
          不提供删除：停用即可，已完成的历史记录会一直保留
        </p>
      </div>
    </BottomSheet>
  )
}

/** 多选星期（编辑模板内使用，保持 ToggleButton 多选风格） */
function WeekdayPickerMulti({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <ToggleButtonGroup
      value={value}
      onChange={(_e, next: number[]) => next.length > 0 && onChange(next)}
      aria-label="选择适用星期"
      fullWidth
    >
      {WEEKDAY_CHARS.map((c, i) => (
        <ToggleButton
          key={i}
          value={i}
          aria-label={`周${c}`}
          sx={{
            height: 44,
            bgcolor: 'var(--tw-overlay-2)',
            color: 'var(--muted-foreground)',
            border: 'none',
            '&:hover': { bgcolor: 'var(--tw-overlay-3)' },
            '&.Mui-selected': {
              bgcolor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              '&:hover': { bgcolor: 'color-mix(in srgb, var(--primary) 88%, #000)' },
            },
          }}
        >
          {c}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}

function ThemeSheet({
  open,
  onClose,
  weekday,
  initial,
}: {
  open: boolean
  onClose: () => void
  weekday: number
  initial: string
}) {
  const save = useSaveTheme()
  const [value, setValue] = useState(initial)
  const [lastInitial, setLastInitial] = useState(initial)

  // initial 变化时同步（避免打断输入）
  if (initial !== lastInitial) {
    setLastInitial(initial)
    setValue(initial)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={`周${WEEKDAY_CHARS[weekday]} · 当日主题`}>
      <div className="flex flex-col gap-5">
        <TextField
          label="主题"
          placeholder="如：设计提升日 · 提升审美和商业设计能力"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="flex gap-3">
          <Button
            variant="text"
            color="inherit"
            onClick={onClose}
            sx={{
              flex: 1,
              color: 'var(--muted-foreground)',
              bgcolor: 'var(--tw-overlay-2)',
              '&:hover': { bgcolor: 'var(--tw-overlay-3)' },
            }}
          >
            取消
          </Button>
          <Button
            variant="contained"
            disabled={value.trim().length === 0}
            loading={save.isPending}
            loadingPosition="start"
            onClick={() => save.mutate({ weekday, theme: value.trim() }, { onSuccess: onClose })}
            sx={{ flex: 2 }}
          >
            保存
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
