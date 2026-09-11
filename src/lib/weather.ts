/**
 * 天气（Open-Meteo，免费无 key，非商用许可 CC-BY 4.0）。
 * 诚实原则：未授权定位 / 离线 / 请求失败 → 返回 null，天气卡整体隐藏（不造假数据）。
 * 缓存 30 分钟（sessionStorage），避免每次进页都打请求。
 */

export interface WeatherHour {
  time: string      /* 'HH:MM' */
  temp: number
  code: number      /* WMO weather code */
}

export interface Weather {
  current: { temp: number; code: number }
  city: string | null
  hours: WeatherHour[]   /* 从当前小时起 6 个 */
}

const CACHE_KEY = 'epoch-weather-v1'
const CACHE_MS = 30 * 60 * 1000

const WMO_LABEL: Record<number, { zh: string; en: string }> = {
  0: { zh: '晴', en: 'Clear' },
  1: { zh: '大致晴', en: 'Mostly clear' },
  2: { zh: '多云', en: 'Partly cloudy' },
  3: { zh: '阴', en: 'Overcast' },
  45: { zh: '雾', en: 'Fog' },
  48: { zh: '雾凇', en: 'Rime fog' },
  51: { zh: '小毛雨', en: 'Light drizzle' },
  53: { zh: '毛雨', en: 'Drizzle' },
  55: { zh: '浓毛雨', en: 'Dense drizzle' },
  61: { zh: '小雨', en: 'Light rain' },
  63: { zh: '雨', en: 'Rain' },
  65: { zh: '大雨', en: 'Heavy rain' },
  71: { zh: '小雪', en: 'Light snow' },
  73: { zh: '雪', en: 'Snow' },
  75: { zh: '大雪', en: 'Heavy snow' },
  80: { zh: '阵雨', en: 'Showers' },
  81: { zh: '阵雨', en: 'Showers' },
  82: { zh: '强阵雨', en: 'Violent showers' },
  95: { zh: '雷暴', en: 'Thunderstorm' },
  96: { zh: '雷暴伴冰雹', en: 'Thunderstorm + hail' },
  99: { zh: '强雷暴', en: 'Severe thunderstorm' },
}

export function wmoLabel(code: number, zh: boolean): string {
  return (WMO_LABEL[code] ?? { zh: '—', en: '—' })[zh ? 'zh' : 'en']!
}

function getCached(): Weather | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { at, data } = JSON.parse(raw) as { at: number; data: Weather }
    if (Date.now() - at > CACHE_MS) return null
    return data
  } catch { return null }
}

function setCached(w: Weather): void {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: w })) } catch { /* ignore */ }
}

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { timeout: 8000, maximumAge: 10 * 60 * 1000 },
    )
  })
}

/** 拉取天气；任何一步失败都返回 null（调用方据此隐藏卡片）。 */
export async function fetchWeather(_lang: string): Promise<Weather | null> {
  const cached = getCached()
  if (cached) return cached
  const pos = await getPosition()
  if (!pos) return null
  const { latitude: lat, longitude: lon } = pos.coords
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
      `&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code` +
      `&forecast_days=2&timezone=auto`
    const resp = await fetch(url)
    if (!resp.ok) return null
    const data = (await resp.json()) as {
      current?: { temperature_2m?: number; weather_code?: number }
      hourly?: { time?: string[]; temperature_2m?: number[]; weather_code?: number[] }
    }
    if (!data.current || !data.hourly?.time) return null

    /* 从当前小时起取 6 个整点 */
    const now = new Date()
    const hours: WeatherHour[] = []
    for (let i = 0; i < data.hourly.time.length && hours.length < 6; i++) {
      const t = new Date(data.hourly.time[i]!)
      if (t < new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours())) continue
      hours.push({
        time: `${String(t.getHours()).padStart(2, '0')}:00`,
        temp: Math.round(data.hourly.temperature_2m?.[i] ?? 0),
        code: data.hourly.weather_code?.[i] ?? 0,
      })
    }

    const w: Weather = {
      current: { temp: Math.round(data.current.temperature_2m ?? 0), code: data.current.weather_code ?? 0 },
      city: null,
      hours,
    }
    setCached(w)
    void w
    return w
  } catch {
    return null
  }
}

/* 反向地理编码城市名超出本轮范围；city 留空，卡片不显示城市行。 */
