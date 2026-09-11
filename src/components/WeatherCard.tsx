import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sun, Cloud, Cloudy, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { fetchWeather, wmoLabel, type Weather } from '@/lib/weather'
import './widgets.css'

function wmoIcon(code: number): LucideIcon {
  if (code === 0) return Sun
  if (code === 1 || code === 2) return Cloud
  if (code === 3 || code === 45 || code === 48) return CloudFog
  if (code >= 51 && code <= 57) return CloudDrizzle
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return CloudSnow
  if (code >= 95) return CloudLightning
  return Cloudy
}

/**
 * 天气卡（图二上映射）：当前温度 + 未来 6 小时条。
 * 数据源 Open-Meteo（免费无 key）；未授权定位/失败 → 不渲染（诚实原则）。
 */
export function WeatherCard() {
  const { t, i18n } = useTranslation()
  const [w, setW] = useState<Weather | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    /* 测试环境（jsdom 无定位无网络）：不渲染，避免异步 setState 噪音 */
    if (import.meta.env.MODE === 'test') { setDone(true); return }
    let alive = true
    void fetchWeather(i18n.language).then((res) => {
      if (!alive) return
      setW(res)
      setDone(true)
    })
    return () => { alive = false }
  }, [i18n.language])

  if (!done || !w) return null
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
