import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { useWeather, wmoIcon, wmoLabel } from '@/lib/weather-ui'
import './widgets.css'

/**
 * 天气卡（图二完整形态）：当前温度 + 未来 6 小时条。
 * M9 后归属：Progress 页（Secondary Context 完整形态）；首页只保留 header 内联一行。
 * 数据源 Open-Meteo（免费无 key）；未授权定位/失败 → 不渲染（诚实原则）。
 */
export function WeatherCard() {
  const { t, i18n } = useTranslation()
  const w = useWeather()
  if (!w) return null
  const zh = i18n.language.startsWith('zh')
  const CurIcon = wmoIcon(w.current.code)

  return (
    <Card pad="md" className="wcard">
      <div className="wcard__head">
        <span className="wcard__now">
          <CurIcon size={28} strokeWidth={1.6} aria-hidden="true" />
          <span className="wcard__temp t-h2 tnum">{w.current.temp}°</span>
        </span>
        <span className="wcard__desc">
          <span className="t-small">{wmoLabel(w.current.code, zh)}</span>
          {w.city && <span className="t-caption">{w.city}</span>}
        </span>
      </div>
      <div className="wcard__hours">
        {w.hours.map((h) => {
          const Icon = wmoIcon(h.code)
          return (
            <div key={h.time} className="wcard__hour">
              <span className="t-caption tnum">{h.time}</span>
              <Icon size={16} strokeWidth={1.6} aria-hidden="true" />
              <span className="t-caption tnum">{h.temp}°</span>
            </div>
          )
        })}
      </div>
      <p className="t-caption wcard__src">{t('weather.source')}</p>
    </Card>
  )
}
