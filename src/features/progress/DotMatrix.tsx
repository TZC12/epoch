import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seg } from '@/components/ui/Seg'
import { useData, completedForKeys } from '@/services/store'
import { useToday } from '@/services/queries'
import { dateKey, addDays } from '@/lib/dates'
import './dot-matrix.css'

type Period = 'daily' | 'weekly' | 'monthly'

interface Column { label: string; keys: string[]; isLast: boolean }

const MAX_DOTS = 10   /* 每列最多点数（超出截断，图五形态） */

/**
 * 点阵数据表（图五映射）：任务完成数据，日/周/月三档切换。
 * 聚合唯一来源 = completedForKeys/completedAllTime（与 Me 累计同源，口径不可能漂移）。
 * Evidence > vanity：只画真实完成，不画目标线不打分。
 */
export function DotMatrix() {
  const { t, i18n } = useTranslation()
  const [period, setPeriod] = useState<Period>('daily')
  const today = useToday()
  const tasks = useData((s) => s.tasks)
  const stats = useData((s) => s.dayStats)
  const zh = i18n.language.startsWith('zh')

  const { columns, total } = useMemo((): { columns: Column[]; total: number } => {
    const now = new Date()
    const mk = (label: string, keys: string[], isLast: boolean): Column => ({ label, keys, isLast })
    const dayLabel = (d: Date) => zh ? `${d.getMonth() + 1}/${d.getDate()}` : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const weekStart = (d: Date) => zh ? `${d.getMonth() + 1}/${d.getDate()}` : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const monthLabel = (d: Date) => zh ? `${d.getMonth() + 1}月` : d.toLocaleDateString('en-US', { month: 'short' })

    if (period === 'daily') {
      const cols: Column[] = []
      for (let i = 13; i >= 0; i--) {
        const d = addDays(now, -i)
        cols.push(mk(dayLabel(d), [dateKey(d)], i === 0))
      }
      /* 标题 = 可见列之和（三档口径统一：大数字恒等于图内各列之和） */
      const total = cols.reduce((s, c) => s + completedForKeys(c.keys, stats, tasks, today), 0)
      return { columns: cols, total }
    }
    if (period === 'weekly') {
      const cols: Column[] = []
      for (let w = 7; w >= 0; w--) {
        const keys: string[] = []
        let first: Date | null = null
        for (let d = 6; d >= 0; d--) {
          const day = addDays(now, -(w * 7) - d)
          if (!first) first = day
          keys.push(dateKey(day))
        }
        cols.push(mk(weekStart(first!), keys, w === 0))
      }
      /* 周合计 = 各列同源相加（= 全历史，因 8 周窗口覆盖全部 stats 的 seed 场景；窗口外 stats 不计入则与列一致） */
      const total = cols.reduce((s, c) => s + completedForKeys(c.keys, stats, tasks, today), 0)
      return { columns: cols, total }
    }
    /* monthly：12 个月，按自然月聚合 keys */
    const cols: Column[] = []
    for (let m = 11; m >= 0; m--) {
      const first = new Date(now.getFullYear(), now.getMonth() - m, 1)
      const next = new Date(now.getFullYear(), now.getMonth() - m + 1, 1)
      const keys: string[] = []
      for (const k of Object.keys(stats)) {
        const d = new Date(`${k}T12:00:00`)
        if (d >= first && d < next) keys.push(k)
      }
      cols.push(mk(monthLabel(first), keys, m === 0))
    }
    const total = cols.reduce((s, c) => s + completedForKeys(c.keys, stats, tasks, today), 0)
    return { columns: cols, total }
  }, [period, stats, tasks, today, zh])

  const rateLabel = total > 0 ? `+${total}` : '0'

  return (
    <section className="dotmatrix" aria-label={t('progress.dataTable')}>
      <div className="dotmatrix__head">
        <div>
          <p className="eyebrow">{t('progress.dataTitle')}</p>
          <p className="dotmatrix__big tnum">{rateLabel}<span className="dotmatrix__unit"> {t('progress.dataUnit')}</span></p>
        </div>
        <Seg
          options={[
            { value: 'daily', label: t('progress.pDaily') },
            { value: 'weekly', label: t('progress.pWeekly') },
            { value: 'monthly', label: t('progress.pMonthly') },
          ]}
          value={period}
          onChange={(v) => setPeriod(v as Period)}
          ariaLabel={t('progress.dataTable')}
        />
      </div>

      <div className="dotmatrix__chart" role="img" aria-label={t('progress.dataTable')}>
        {columns.map((c, ci) => {
          const done = completedForKeys(c.keys, stats, tasks, today)
          const dots = Math.min(MAX_DOTS, done)
          /* 位置化稀疏标注（与"今天"无关，午夜边界不分裂）：隔列 + 恒显末列 */
          const showLabel = columns.length <= 8 || ci % 2 === 1 || ci === columns.length - 1
          return (
            <div key={ci} className={`dotmatrix__col ${c.isLast ? 'is-last' : ''}`}>
              <div className="dotmatrix__dots">
                {Array.from({ length: MAX_DOTS }, (_, ri) => (
                  <i key={ri} className={ri < dots ? 'is-on' : ''} />
                ))}
              </div>
              <span className={`dotmatrix__label t-caption tnum ${c.isLast ? 'is-cur' : ''}`}>{showLabel ? c.label : ''}</span>
            </div>
          )
        })}
      </div>
      <p className="t-caption dotmatrix__foot">{t('progress.dataFoot')}</p>
    </section>
  )
}
