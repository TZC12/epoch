import { useEffect, useState } from 'react'
import { Sun, Cloud, Cloudy, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, type LucideIcon } from 'lucide-react'
import { fetchWeather, wmoLabel, type Weather } from './weather'

export { wmoLabel }
export type { Weather }

/** WMO 天气码 → Lucide 图标（天气卡/首页内联共用）。 */
export function wmoIcon(code: number): LucideIcon {
  if (code === 0) return Sun
  if (code === 1 || code === 2) return Cloud
  if (code === 3 || code === 45 || code === 48) return CloudFog
  if (code >= 51 && code <= 57) return CloudDrizzle
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return CloudSnow
  if (code >= 95) return CloudLightning
  return Cloudy
}

/** 天气数据 hook（30 分钟缓存见 weather.ts；失败/未授权 → null）。测试环境不拉取。 */
export function useWeather(): Weather | null {
  const [w, setW] = useState<Weather | null>(null)

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return
    let alive = true
    void fetchWeather(document.documentElement.lang).then((res) => {
      if (alive) setW(res)
    })
    return () => { alive = false }
  }, [])

  return w
}
