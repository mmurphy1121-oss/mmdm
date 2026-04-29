import type { WeatherHour, GearItem, Insight, CalendarEvent, DailySummary, CurrentWeather, WeatherData } from '@/data/mockData'
import type { OuraReadiness, OuraSleep } from '@/hooks/useOura'
import { format, addDays, parseISO } from 'date-fns'

export interface ScheduleOptimization {
  id: string
  eventTitle: string
  eventDateLabel: string   // "Tomorrow", "Wednesday"
  betterDateLabel: string  // "Today", "Thursday"
  currentCondition: string // "rainy, 52°F"
  betterCondition: string  // "sunny, 71°F"
  reason: string
}

export interface OutfitItem {
  icon: string
  label: string
}

export interface OutfitRecommendation {
  summary: string
  items: OutfitItem[]
  tip?: string
}

// ── WMO weather code → human-readable ───────────────────────────────────────

const WMO: Record<number, { condition: string; description: string }> = {
  0:  { condition: 'Clear',          description: 'Clear sky' },
  1:  { condition: 'Mostly Clear',   description: 'Mainly clear' },
  2:  { condition: 'Partly Cloudy',  description: 'Partly cloudy' },
  3:  { condition: 'Overcast',       description: 'Overcast' },
  45: { condition: 'Foggy',          description: 'Fog' },
  48: { condition: 'Foggy',          description: 'Rime fog' },
  51: { condition: 'Drizzle',        description: 'Light drizzle' },
  53: { condition: 'Drizzle',        description: 'Moderate drizzle' },
  55: { condition: 'Heavy Drizzle',  description: 'Dense drizzle' },
  61: { condition: 'Rain',           description: 'Slight rain' },
  63: { condition: 'Rain',           description: 'Moderate rain' },
  65: { condition: 'Heavy Rain',     description: 'Heavy rain' },
  71: { condition: 'Snow',           description: 'Slight snow' },
  73: { condition: 'Snow',           description: 'Moderate snow' },
  75: { condition: 'Heavy Snow',     description: 'Heavy snow' },
  77: { condition: 'Snow Grains',    description: 'Snow grains' },
  80: { condition: 'Showers',        description: 'Slight showers' },
  81: { condition: 'Showers',        description: 'Moderate showers' },
  82: { condition: 'Heavy Showers',  description: 'Violent showers' },
  85: { condition: 'Snow Showers',   description: 'Slight snow showers' },
  86: { condition: 'Snow Showers',   description: 'Heavy snow showers' },
  95: { condition: 'Thunderstorm',   description: 'Thunderstorm' },
  96: { condition: 'Thunderstorm',   description: 'Thunderstorm w/ hail' },
  99: { condition: 'Thunderstorm',   description: 'Thunderstorm w/ heavy hail' },
}

function wmo(code: number) {
  return WMO[code] ?? { condition: 'Unknown', description: 'Unknown conditions' }
}

// ── Weather emoji ────────────────────────────────────────────────────────────

export function getWeatherEmoji(condition: string): string {
  const c = condition.toLowerCase()
  if (c.includes('thunder')) return '⛈️'
  if (c.includes('heavy snow') || c.includes('snow shower')) return '🌨️'
  if (c.includes('snow')) return '❄️'
  if (c.includes('heavy rain') || c.includes('heavy shower')) return '🌧️'
  if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) return '🌦️'
  if (c.includes('fog')) return '🌫️'
  if (c.includes('overcast')) return '☁️'
  if (c.includes('partly cloudy') || c.includes('cloudy')) return '⛅'
  if (c.includes('mostly clear')) return '🌤️'
  return '☀️'
}

// ── Open-Meteo response types ────────────────────────────────────────────────

interface OpenMeteoResponse {
  current: {
    time: string
    temperature_2m: number
    apparent_temperature: number
    relative_humidity_2m: number
    wind_speed_10m: number
    uv_index: number
    weather_code: number
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    apparent_temperature: number[]
    relative_humidity_2m: number[]
    wind_speed_10m: number[]
    uv_index: number[]
    precipitation_probability: number[]
    weather_code: number[]
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max: number[]
  }
}

function formatHour(isoTime: string): string {
  const h = new Date(isoTime).getHours()
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  return h > 12 ? `${h - 12} PM` : `${h} AM`
}

// ── Parse Open-Meteo API response → WeatherData ──────────────────────────────

export function parseWeatherData(data: OpenMeteoResponse): WeatherData {
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // Hourly grouped by date (6 AM – 11 PM only to keep UI clean)
  const hourlyByDate: Record<string, WeatherHour[]> = {}
  data.hourly.time.forEach((iso, i) => {
    const d = new Date(iso)
    const dateKey = format(d, 'yyyy-MM-dd')
    const hour = d.getHours()
    if (hour < 6) return

    const info = wmo(data.hourly.weather_code[i])
    const entry: WeatherHour = {
      time: formatHour(iso),
      temp: Math.round(data.hourly.temperature_2m[i]),
      feelsLike: Math.round(data.hourly.apparent_temperature[i]),
      humidity: data.hourly.relative_humidity_2m[i],
      wind: Math.round(data.hourly.wind_speed_10m[i]),
      uv: Math.round(data.hourly.uv_index[i] * 10) / 10,
      condition: info.condition,
      description: info.description,
      pop: data.hourly.precipitation_probability[i] ?? 0,
    }
    if (!hourlyByDate[dateKey]) hourlyByDate[dateKey] = []
    hourlyByDate[dateKey].push(entry)
  })

  // Daily summaries
  const daily: DailySummary[] = data.daily.time.map((dateStr, i) => {
    const info = wmo(data.daily.weather_code[i])
    return {
      date: dateStr,
      condition: info.condition,
      description: info.description,
      high: Math.round(data.daily.temperature_2m_max[i]),
      low: Math.round(data.daily.temperature_2m_min[i]),
      pop: data.daily.precipitation_probability_max[i] ?? 0,
    }
  })

  // Current conditions
  const currentInfo = wmo(data.current.weather_code)
  const todayDaily = daily.find(d => d.date === todayStr)
  const current: CurrentWeather = {
    temp: Math.round(data.current.temperature_2m),
    feelsLike: Math.round(data.current.apparent_temperature),
    humidity: data.current.relative_humidity_2m,
    wind: Math.round(data.current.wind_speed_10m),
    uv: Math.round(data.current.uv_index * 10) / 10,
    condition: currentInfo.condition,
    description: currentInfo.description,
    high: todayDaily?.high ?? Math.round(data.current.temperature_2m),
    low: todayDaily?.low ?? Math.round(data.current.temperature_2m),
  }

  return {
    current,
    hourly: hourlyByDate[todayStr] ?? [],
    hourlyByDate,
    daily,
  }
}

// ── Fetch weather from Open-Meteo (no API key needed) ───────────────────────

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,uv_index,weather_code',
    hourly: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,uv_index,precipitation_probability,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '7',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error('Weather fetch failed')
  return parseWeatherData(await res.json())
}

// ── Gear checklist ───────────────────────────────────────────────────────────

export function generateGearChecklist(hourly: WeatherHour[]): GearItem[] {
  const items: GearItem[] = []
  const hasRain = hourly.some(h => h.pop > 40)
  const hasThunder = hourly.some(h => h.condition.toLowerCase().includes('thunder'))
  const hasSnow = hourly.some(h => h.condition.toLowerCase().includes('snow'))
  const highUV = hourly.some(h => h.uv >= 6)
  const highWind = hourly.some(h => h.wind > 20)
  const maxTemp = Math.max(...hourly.map(h => h.temp))
  const minTemp = Math.min(...hourly.map(h => h.temp))

  if (hasRain || hasThunder) {
    items.push({ id: 'umbrella', label: 'Umbrella', icon: '☂️', checked: false })
    items.push({ id: 'raincoat', label: 'Rain jacket', icon: '🧥', checked: false })
  }

  if (hasSnow) {
    items.push({ id: 'boots', label: 'Snow boots', icon: '👢', checked: false })
    items.push({ id: 'warmhat', label: 'Warm hat', icon: '🎩', checked: false })
    items.push({ id: 'gloves', label: 'Gloves', icon: '🧤', checked: false })
  } else if (minTemp < 40) {
    items.push({ id: 'heavycoat', label: 'Heavy coat', icon: '🧥', checked: false })
    items.push({ id: 'gloves', label: 'Gloves', icon: '🧤', checked: false })
    items.push({ id: 'scarf', label: 'Scarf', icon: '🧣', checked: false })
  } else if (maxTemp < 60) {
    items.push({ id: 'jacket', label: 'Light jacket', icon: '🫧', checked: false })
  }

  if (highUV) {
    items.push({ id: 'sunscreen', label: 'Sunscreen SPF 30+', icon: '🌞', checked: false })
    items.push({ id: 'sunglasses', label: 'Sunglasses', icon: '🕶️', checked: false })
    items.push({ id: 'hat', label: 'Sun hat', icon: '👒', checked: false })
  }

  if (highWind) {
    items.push({ id: 'windbreaker', label: 'Windbreaker', icon: '💨', checked: false })
  }

  items.push({ id: 'water', label: 'Water bottle', icon: '💧', checked: false })

  return items
}

// ── Sample calendar events ───────────────────────────────────────────────────

export function generateCalendarEvents(hourly: WeatherHour[]): CalendarEvent[] {
  void hourly
  return [
    { id: 'mock-1', title: 'Morning Walk',   startTime: '07:00', endTime: '08:00', color: '#22c55e' },
    { id: 'mock-2', title: 'Team Standup',   startTime: '09:00', endTime: '09:30', color: '#3b82f6' },
    { id: 'mock-3', title: 'Lunch Break',    startTime: '12:00', endTime: '13:00', color: '#f59e0b' },
    { id: 'mock-4', title: 'Afternoon Run',  startTime: '17:00', endTime: '18:00', color: '#8b5cf6' },
    { id: 'mock-5', title: 'Evening Dinner', startTime: '19:00', endTime: '20:30', color: '#ec4899' },
  ]
}

// ── Map real calendar events → add weather context ───────────────────────────

function hour24ToLabel(startTime: string): string {
  const [hStr] = startTime.split(':')
  const h = parseInt(hStr, 10)
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  return h > 12 ? `${h - 12} PM` : `${h} AM`
}

export function mapRealCalendarEvents(
  events: CalendarEvent[],
  hourly: WeatherHour[],
): CalendarEvent[] {
  return events.map(event => {
    const label = hour24ToLabel(event.startTime)
    const hw = hourly.find(h => h.time === label)

    let weatherContext: string | undefined
    if (hw) {
      if (hw.pop > 60)      weatherContext = `Rain likely (${hw.pop}%) — bring an umbrella`
      else if (hw.pop > 35) weatherContext = `Chance of rain (${hw.pop}%)`
      else if (hw.uv >= 8)  weatherContext = `UV index ${hw.uv} — apply sunscreen`
      else if (hw.temp < 38) weatherContext = `Very cold (${hw.temp}°F) — dress warmly`
      else if (hw.wind > 25) weatherContext = `Gusty winds at ${hw.wind} mph`
    }

    return { ...event, weatherContext }
  })
}

// ── Outfit recommendation ────────────────────────────────────────────────────

export function generateOutfit(hourly: WeatherHour[]): OutfitRecommendation {
  if (hourly.length === 0) return { summary: '', items: [] }

  const maxTemp  = Math.max(...hourly.map(h => h.temp))
  const minTemp  = Math.min(...hourly.map(h => h.temp))
  const tempDrop = maxTemp - minTemp
  const hasRain  = hourly.some(h => h.pop > 40)
  const heavyRain = hourly.some(h => h.pop > 65)
  const hasSnow  = hourly.some(h => h.condition.toLowerCase().includes('snow'))
  const highUV   = hourly.some(h => h.uv >= 6)
  const gusty    = hourly.some(h => h.wind > 20)
  const maxWind  = Math.max(...hourly.map(h => h.wind))

  const items: OutfitItem[] = []
  let summary = ''
  let tip: string | undefined

  // ── Outer layer ──
  if (hasSnow || minTemp < 20) {
    summary = "Bundle up — it's truly freezing"
    items.push({ icon: '🧥', label: 'Heavy puffer coat' })
    items.push({ icon: '🧣', label: 'Scarf & gloves' })
    items.push({ icon: '🎩', label: 'Warm hat' })
  } else if (minTemp < 35) {
    summary = 'Heavy coat weather today'
    items.push({ icon: '🧥', label: 'Heavy coat' })
    items.push({ icon: '🧣', label: 'Scarf' })
  } else if (minTemp < 48) {
    summary = heavyRain ? 'Waterproof trench coat is the move' : 'Trench coat or heavy jacket'
    items.push({ icon: '🧥', label: heavyRain ? 'Waterproof trench coat' : 'Trench coat' })
    if (minTemp < 42) items.push({ icon: '🧣', label: 'Light scarf' })
  } else if (minTemp < 58) {
    summary = hasRain ? 'Light rain jacket or sweater' : 'A light jacket or sweater will do'
    items.push({ icon: '🫧', label: hasRain ? 'Light rain jacket' : 'Light jacket' })
  } else if (maxTemp < 70) {
    summary = 'A light layer is all you need'
    items.push({ icon: '👘', label: 'Cardigan or light sweater' })
  } else {
    summary = 'Light and breezy — keep it simple'
    items.push({ icon: '👕', label: 'T-shirt or light top' })
    if (hasRain) items.push({ icon: '🫧', label: 'Light layer for rain' })
  }

  // ── Bottoms ──
  if (maxTemp >= 76 && !hasRain && minTemp >= 60) {
    items.push({ icon: '🩳', label: 'Shorts or a light skirt' })
  } else if (minTemp < 45) {
    items.push({ icon: '👖', label: 'Warm or lined pants' })
  } else {
    items.push({ icon: '👖', label: 'Jeans or pants' })
  }

  // ── Footwear ──
  if (hasSnow) {
    items.push({ icon: '👢', label: 'Snow boots' })
  } else if (heavyRain) {
    items.push({ icon: '👢', label: 'Rain boots or waterproof shoes' })
  } else if (hasRain) {
    items.push({ icon: '👟', label: 'Water-resistant shoes' })
  } else if (maxTemp >= 76) {
    items.push({ icon: '👟', label: 'Sneakers or sandals' })
  } else {
    items.push({ icon: '👟', label: 'Sneakers' })
  }

  // ── Accessories ──
  if (highUV && !hasRain) items.push({ icon: '🕶️', label: 'Sunglasses' })
  if (heavyRain)          items.push({ icon: '☂️', label: 'Umbrella' })

  // ── Tip ──
  if (tempDrop >= 18) {
    tip = `Temps drop ${Math.round(tempDrop)}° from day to night — toss an extra layer in your bag.`
  } else if (gusty && !tip) {
    tip = `Gusts up to ${maxWind} mph — a windbreaker over your top layer helps.`
  } else if (hasRain && minTemp >= 58 && !tip) {
    tip = `Showers possible — a packable jacket keeps you covered without bulk.`
  }

  return { summary, items, tip }
}

// ── Hour label → 24h number ──────────────────────────────────────────────────

function labelToHour(label: string): number {
  const [numStr, period] = label.split(' ')
  let h = parseInt(numStr, 10)
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return h
}

function avg(hours: WeatherHour[], key: keyof WeatherHour): number {
  if (hours.length === 0) return 0
  return hours.reduce((s, h) => s + (h[key] as number), 0) / hours.length
}

// ── UV label ─────────────────────────────────────────────────────────────────

export function uvLabel(uv: number): string {
  if (uv <= 2)  return 'Low'
  if (uv <= 5)  return 'Moderate'
  if (uv <= 7)  return 'High'
  if (uv <= 10) return 'Very High'
  return 'Extreme'
}

// ── Smart insights ───────────────────────────────────────────────────────────

export function generateInsights(hourly: WeatherHour[], events: CalendarEvent[]): Insight[] {
  const insights: Insight[] = []

  const morningHours = hourly.filter(h => { const h24 = labelToHour(h.time); return h24 >= 6  && h24 <= 10 })
  const lunchHours   = hourly.filter(h => { const h24 = labelToHour(h.time); return h24 >= 11 && h24 <= 14 })
  const eveningHours = hourly.filter(h => { const h24 = labelToHour(h.time); return h24 >= 17 && h24 <= 20 })

  // ☕ Coffee recommendation
  if (morningHours.length > 0) {
    const morningTemp = Math.round(avg(morningHours, 'temp'))
    if (morningTemp >= 68) {
      insights.push({ id: 'coffee', type: 'tip',
        message: `${morningTemp}°F morning — perfect iced coffee weather ☕`,
      })
    } else if (morningTemp < 50) {
      insights.push({ id: 'coffee', type: 'tip',
        message: `Chilly ${morningTemp}°F morning — a hot coffee will hit the spot ☕`,
      })
    } else {
      insights.push({ id: 'coffee', type: 'info',
        message: `${morningTemp}°F morning — either hot or iced coffee works ☕`,
      })
    }
  }

  // 🍜 Lunch recommendation
  if (lunchHours.length > 0) {
    const lunchTemp = Math.round(avg(lunchHours, 'temp'))
    const lunchRain = lunchHours.some(h => h.pop > 40)
    if (lunchTemp < 52 || lunchRain) {
      insights.push({ id: 'lunch', type: 'tip',
        message: `${lunchRain ? 'Rainy' : 'Cold'} lunch hour (${lunchTemp}°F) — great day for soup 🍜`,
      })
    } else if (lunchTemp >= 70 && !lunchRain) {
      insights.push({ id: 'lunch', type: 'tip',
        message: `Sunny ${lunchTemp}°F at lunch — eat outside or grab a salad 🥗`,
      })
    } else {
      insights.push({ id: 'lunch', type: 'info',
        message: `Mild ${lunchTemp}°F at lunch — a light meal sounds right 🥙`,
      })
    }
  }

  // 🏃 Run recommendation (5 PM+)
  const goodRunHours = eveningHours.filter(h => h.temp >= 50 && h.temp <= 82 && h.pop < 30 && h.wind < 20)
  if (goodRunHours.length >= 2) {
    const best = goodRunHours[0]
    insights.push({ id: 'run', type: 'tip',
      message: `Great running conditions at ${best.time} — ${best.temp}°F, ${best.pop}% chance of rain 🏃`,
    })
  } else if (eveningHours.length > 0) {
    const bestEvening = eveningHours.reduce((a, b) => (a.pop < b.pop ? a : b))
    if (bestEvening.temp >= 40 && bestEvening.pop < 60) {
      insights.push({ id: 'run', type: 'info',
        message: `Evening run possible around ${bestEvening.time} — ${bestEvening.temp}°F, dress for the conditions 🏃`,
      })
    }
  }

  // 🌧 Rain warning
  const rainHours = hourly.filter(h => h.pop > 50)
  if (rainHours.length > 0) {
    const peak = rainHours.reduce((a, b) => (a.pop > b.pop ? a : b))
    insights.push({ id: 'rain', type: 'warning',
      message: `Rain likely around ${peak.time} (${peak.pop}% chance) — grab an umbrella.`,
    })
  }

  // 🌞 UV warning
  const uvPeak = hourly.reduce((a, b) => (a.uv > b.uv ? a : b), hourly[0])
  if (uvPeak && uvPeak.uv >= 6) {
    insights.push({ id: 'uv', type: 'warning',
      message: `UV peaks at ${uvPeak.uv} (${uvLabel(uvPeak.uv)}) around ${uvPeak.time} — apply sunscreen.`,
    })
  }

  // ❄️ Cold snap
  const coldHours = hourly.filter(h => h.temp < 38)
  if (coldHours.length > 0) {
    insights.push({ id: 'cold', type: 'warning',
      message: `Temperatures drop to ${Math.min(...coldHours.map(h => h.temp))}°F — layer up.`,
    })
  }

  // Best outdoor window
  const outdoorHours = hourly.filter(h => h.temp >= 62 && h.temp <= 82 && h.pop < 20 && h.uv < 8)
  if (outdoorHours.length >= 2) {
    const first = outdoorHours[0]
    const last  = outdoorHours[outdoorHours.length - 1]
    insights.push({ id: 'outdoor', type: 'tip',
      message: `Best time outside: ${first.time} – ${last.time} (${first.temp}°–${last.temp}°F).`,
    })
  }

  // Event weather conflicts
  events.forEach(ev => {
    if (ev.weatherContext) {
      insights.push({ id: `ev-${ev.id}`, type: 'info',
        message: `"${ev.title}" at ${formatDisplayTime(ev.startTime)}: ${ev.weatherContext}`,
      })
    }
  })

  return insights.slice(0, 8)
}

function formatDisplayTime(startTime: string): string {
  const [hStr, mStr] = startTime.split(':')
  const h = parseInt(hStr, 10)
  const m = mStr === '00' ? '' : `:${mStr}`
  if (h === 0) return `12${m} AM`
  if (h === 12) return `12${m} PM`
  return h > 12 ? `${h - 12}${m} PM` : `${h}${m} AM`
}

// ── Schedule optimizer ───────────────────────────────────────────────────────

const OUTDOOR_KEYWORDS = [
  'run', 'running', 'jog', 'jogging', 'walk', 'walking', 'hike', 'hiking',
  'bike', 'biking', 'cycle', 'cycling', 'tennis', 'golf', 'swim', 'swimming',
  'outdoor', 'outside', 'park', 'picnic', 'yoga', 'workout', 'exercise',
  'spin', 'row', 'rowing', 'class', 'practice', 'game', 'match',
]

function isWeatherSensitive(title: string): boolean {
  const lower = title.toLowerCase()
  return OUTDOOR_KEYWORDS.some(kw => lower.includes(kw))
}

function dayWeatherScore(hourly: WeatherHour[]): number {
  if (hourly.length === 0) return 0
  const active = hourly.filter(h => { const h24 = labelToHour(h.time); return h24 >= 8 && h24 <= 19 })
  const sample = active.length > 0 ? active : hourly
  const meanTemp = avg(sample, 'temp')
  const maxPop   = Math.max(...sample.map(h => h.pop))
  const maxWind  = Math.max(...sample.map(h => h.wind))

  let score = 100
  score -= maxPop * 0.75
  if (meanTemp < 45) score -= (45 - meanTemp) * 2
  if (meanTemp > 88) score -= (meanTemp - 88) * 2
  if (maxWind > 20)  score -= (maxWind - 20) * 0.8
  return Math.max(0, Math.round(score))
}

function dayLabel(dateKey: string): string {
  const todayKey    = format(new Date(), 'yyyy-MM-dd')
  const tomorrowKey = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  if (dateKey === todayKey)    return 'Today'
  if (dateKey === tomorrowKey) return 'Tomorrow'
  return format(parseISO(dateKey), 'EEEE')
}

function conditionSummary(hourly: WeatherHour[]): string {
  if (hourly.length === 0) return 'unknown'
  const mid = hourly.find(h => { const h24 = labelToHour(h.time); return h24 >= 12 && h24 <= 14 })
    ?? hourly[Math.floor(hourly.length / 2)]
  return `${mid.condition.toLowerCase()}, ${mid.temp}°F`
}

export function generateScheduleOptimizations(
  weekEvents: Record<string, CalendarEvent[]>,
  hourlyByDate: Record<string, WeatherHour[]>,
): ScheduleOptimization[] {
  const results: ScheduleOptimization[] = []
  const todayKey = format(new Date(), 'yyyy-MM-dd')

  // Pre-score every day we have weather for
  const dayScores = Object.fromEntries(
    Object.entries(hourlyByDate).map(([d, h]) => [d, dayWeatherScore(h)])
  )

  for (const [dateKey, events] of Object.entries(weekEvents)) {
    const hourly = hourlyByDate[dateKey] ?? []
    const score  = dayScores[dateKey] ?? 0

    for (const event of events) {
      if (!isWeatherSensitive(event.title)) continue
      if (score >= 68) continue  // already decent weather — no need to move

      // Find best alternative day (must be ≥20 pts better and within the week)
      const alternatives = Object.entries(dayScores)
        .filter(([d]) => d !== dateKey && d >= todayKey)
        .filter(([, s]) => s >= score + 20)
        .sort(([, a], [, b]) => b - a)

      if (alternatives.length === 0) continue

      const [bestDate] = alternatives[0]
      const currentHourly = hourlyByDate[dateKey] ?? []
      const betterHourly  = hourlyByDate[bestDate] ?? []

      const maxRain = Math.max(...(currentHourly.map(h => h.pop)), 0)
      const reason  = maxRain > 50
        ? `${dayLabel(dateKey)} has a ${maxRain}% chance of rain`
        : `Weather is poor on ${dayLabel(dateKey)} (${conditionSummary(currentHourly)})`

      results.push({
        id:               `${event.id}-opt`,
        eventTitle:       event.title,
        eventDateLabel:   dayLabel(dateKey),
        betterDateLabel:  dayLabel(bestDate),
        currentCondition: conditionSummary(currentHourly),
        betterCondition:  conditionSummary(betterHourly),
        reason,
      })
    }
  }

  // Deduplicate by event title (keep best suggestion per title)
  const seen = new Set<string>()
  return results
    .filter(r => { const ok = !seen.has(r.eventTitle); seen.add(r.eventTitle); return ok })
    .slice(0, 4)
}

// ── Oura-aware insights ──────────────────────────────────────────────────────

export function generateOuraInsights(
  readiness: OuraReadiness | null,
  sleep: OuraSleep | null,
  hourly: WeatherHour[],
): Insight[] {
  const insights: Insight[] = []
  if (!readiness && !sleep) return insights

  const goodWeather = hourly.filter(h => {
    const h24 = labelToHour(h.time)
    return h24 >= 7 && h24 <= 20 && h.temp >= 45 && h.temp <= 80 && h.pop < 30 && h.wind < 20
  })
  const niceOutside = goodWeather.length >= 2

  // ── Readiness ──
  if (readiness) {
    const s = readiness.score
    if (s >= 85) {
      insights.push({
        id: 'oura-readiness',
        type: 'tip',
        message: niceOutside
          ? `Readiness ${s} — you're firing on all cylinders 💪 Weather's perfect too. Ideal day to push hard on a run or workout.`
          : `Readiness ${s} — peak recovery today 💪 Great day to train hard, even if you need to head indoors.`,
      })
    } else if (s >= 70) {
      insights.push({
        id: 'oura-readiness',
        type: 'info',
        message: `Readiness ${s} — solid recovery. A moderate workout${niceOutside ? ' outside' : ''} is on the table today.`,
      })
    } else if (s >= 55) {
      insights.push({
        id: 'oura-readiness',
        type: 'info',
        message: `Readiness ${s} — still recovering. Stick to lighter activity today and don't push it.`,
      })
    } else {
      insights.push({
        id: 'oura-readiness',
        type: 'warning',
        message: `Readiness ${s} — your body is asking for rest 😴 Swap any intense plans for a gentle walk or stretching.`,
      })
    }
  }

  // ── Sleep ──
  if (sleep && sleep.total_sleep_duration > 0) {
    const hrs = sleep.total_sleep_duration / 3600
    const hrsStr = `${Math.floor(hrs)}h ${Math.round((hrs % 1) * 60)}m`

    if (hrs < 5.5) {
      insights.push({
        id: 'oura-sleep',
        type: 'warning',
        message: `Only ${hrsStr} of sleep last night ☕☕ — you've earned two coffees. Skip the hard workout today.`,
      })
    } else if (hrs < 6.5) {
      insights.push({
        id: 'oura-sleep',
        type: 'info',
        message: `${hrsStr} of sleep — a little short. An extra coffee and a lighter day will serve you well.`,
      })
    } else if (hrs >= 8) {
      insights.push({
        id: 'oura-sleep',
        type: 'tip',
        message: `${hrsStr} of sleep 😴 — well rested and ready to go. Make the most of it.`,
      })
    }
  }

  // ── HRV bonus insight ──
  if (readiness?.hrv_balance && readiness.hrv_balance >= 90) {
    insights.push({
      id: 'oura-hrv',
      type: 'tip',
      message: `HRV balance is excellent (${readiness.hrv_balance}) — a strong sign your nervous system is recovered.`,
    })
  }

  return insights
}

// ── Oura + weather schedule nudges ──────────────────────────────────────────

export interface OuraNudge {
  id: string
  message: string
  type: 'boost' | 'rest' | 'info'
}

export function generateOuraNudges(
  readiness: OuraReadiness | null,
  sleep: OuraSleep | null,
  hourly: WeatherHour[],
  events: CalendarEvent[],
): OuraNudge[] {
  if (!readiness && !sleep) return []
  const nudges: OuraNudge[] = []

  const readScore  = readiness?.score ?? 75
  const sleepHrs   = sleep ? sleep.total_sleep_duration / 3600 : 7
  const goodWindow = hourly.filter(h => {
    const h24 = labelToHour(h.time)
    return h24 >= 7 && h24 <= 20 && h.temp >= 48 && h.pop < 25 && h.wind < 20
  })

  const hasOutdoorEvent = events.some(e =>
    OUTDOOR_KEYWORDS.some(kw => e.title.toLowerCase().includes(kw))
  )

  // High energy + good weather + no outdoor event already planned
  if (readScore >= 85 && goodWindow.length >= 2 && !hasOutdoorEvent) {
    const best = goodWindow[0]
    nudges.push({
      id: 'boost-workout',
      type: 'boost',
      message: `You have a lot of energy today (readiness ${readScore}) and the weather is great at ${best.time} (${best.temp}°F). Go for a run! 🏃`,
    })
  }

  // Low readiness + outdoor event scheduled → suggest scaling back
  if (readScore < 60 && hasOutdoorEvent) {
    nudges.push({
      id: 'rest-outdoor',
      type: 'rest',
      message: `Readiness is low (${readScore}) — consider a gentle version of your outdoor plans today instead of going hard.`,
    })
  }

  // Poor sleep + early morning events
  const earlyEvent = events.find(e => parseInt(e.startTime.split(':')[0], 10) < 9)
  if (sleepHrs < 6 && earlyEvent) {
    nudges.push({
      id: 'rest-early',
      type: 'rest',
      message: `Short night (${Math.floor(sleepHrs)}h sleep) before "${earlyEvent.title}" — prep a coffee and give yourself extra time to wake up.`,
    })
  }

  // Great sleep + great weather → seize the day
  if (sleepHrs >= 8 && goodWindow.length >= 3 && readScore >= 75) {
    nudges.push({
      id: 'boost-allday',
      type: 'boost',
      message: `Slept ${Math.floor(sleepHrs)}h, readiness ${readScore}, and a beautiful day ahead — this is a day to say yes to everything.`,
    })
  }

  return nudges.slice(0, 3)
}

export { parseISO }
