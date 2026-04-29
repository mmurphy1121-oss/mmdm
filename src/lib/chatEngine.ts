import type { WeatherHour, CalendarEvent } from '@/data/mockData'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: Date
}

interface ActivityProfile {
  keywords: string[]
  idealTempMin: number
  idealTempMax: number
  maxPop: number
  maxWind: number
  label: string
}

const ACTIVITIES: ActivityProfile[] = [
  {
    keywords: ['walk', 'stroll', 'wander', 'strolling', 'walking'],
    idealTempMin: 52, idealTempMax: 80, maxPop: 25, maxWind: 18,
    label: 'walk',
  },
  {
    keywords: ['run', 'jog', 'running', 'jogging'],
    idealTempMin: 42, idealTempMax: 70, maxPop: 20, maxWind: 18,
    label: 'run',
  },
  {
    keywords: ['hike', 'hiking', 'trail', 'trails'],
    idealTempMin: 48, idealTempMax: 75, maxPop: 15, maxWind: 15,
    label: 'hike',
  },
  {
    keywords: ['bike', 'biking', 'cycle', 'cycling', 'bicycle', 'ride'],
    idealTempMin: 50, idealTempMax: 78, maxPop: 15, maxWind: 15,
    label: 'bike ride',
  },
  {
    keywords: ['picnic', 'eat outside', 'lunch outside', 'brunch outside'],
    idealTempMin: 65, idealTempMax: 82, maxPop: 10, maxWind: 12,
    label: 'picnic',
  },
  {
    keywords: ['coffee', 'sit outside', 'read outside', 'café', 'cafe'],
    idealTempMin: 60, idealTempMax: 85, maxPop: 15, maxWind: 12,
    label: 'sitting outside',
  },
  {
    keywords: ['tennis', 'golf', 'padel', 'paddle', 'soccer', 'basketball', 'frisbee', 'volleyball'],
    idealTempMin: 55, idealTempMax: 82, maxPop: 10, maxWind: 12,
    label: 'outdoor game',
  },
  {
    keywords: ['swim', 'swimming', 'pool', 'beach', 'lake'],
    idealTempMin: 75, idealTempMax: 95, maxPop: 10, maxWind: 12,
    label: 'swim',
  },
  {
    keywords: ['yoga', 'pilates', 'stretch', 'stretching'],
    idealTempMin: 60, idealTempMax: 82, maxPop: 20, maxWind: 15,
    label: 'outdoor yoga',
  },
  {
    keywords: ['workout', 'exercise', 'train', 'training', 'gym'],
    idealTempMin: 45, idealTempMax: 78, maxPop: 30, maxWind: 20,
    label: 'workout',
  },
]

function detectActivity(text: string): ActivityProfile | null {
  const lower = text.toLowerCase()
  for (const a of ACTIVITIES) {
    if (a.keywords.some(kw => lower.includes(kw))) return a
  }
  return null
}

function labelToHour24(label: string): number {
  const [numStr, period] = label.split(' ')
  let h = parseInt(numStr, 10)
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return h
}

function scoreHour(h: WeatherHour, a: ActivityProfile): number {
  let score = 100
  score -= h.pop * 0.8
  if (h.temp < a.idealTempMin) score -= (a.idealTempMin - h.temp) * 2
  if (h.temp > a.idealTempMax) score -= (h.temp - a.idealTempMax) * 2
  if (h.wind > a.maxWind) score -= (h.wind - a.maxWind) * 1.5
  return Math.max(0, Math.round(score))
}

function formatBold(text: string): string {
  // just return as-is; ChatBot.tsx will render ** as bold
  return text
}

export function getActivityRecommendation(
  text: string,
  hourly: WeatherHour[],
  events: CalendarEvent[],
): string {
  if (hourly.length === 0) {
    return "I don't have today's weather data yet — try again in a moment!"
  }

  const activity = detectActivity(text)

  if (!activity) {
    return "I can help you find the best time for outdoor activities! Try asking things like:\n• \"When should I go for a run?\"\n• \"Best time for a walk with a friend?\"\n• \"When can I do outdoor yoga?\""
  }

  // Only look at reasonable waking hours (7 AM – 9 PM)
  const candidates = hourly.filter(h => {
    const h24 = labelToHour24(h.time)
    return h24 >= 7 && h24 <= 21
  })

  const scored = candidates
    .map(h => ({ hour: h, score: scoreHour(h, activity) }))
    .sort((a, b) => b.score - a.score)

  const viableSlots = scored.filter(x => x.score > 25)

  if (viableSlots.length === 0) {
    const worstRain = Math.max(...hourly.map(h => h.pop))
    const reason = worstRain > 60 ? 'too rainy' : 'weather conditions are unfavorable'
    return `Today's forecast looks ${reason} for a ${activity.label} 😕 — might be worth waiting for a better day.`
  }

  const best   = viableSlots[0]
  const second = viableSlots[1]

  // Check for calendar conflicts
  const conflict = events.find(e => {
    const evH = parseInt(e.startTime.split(':')[0], 10)
    const bestH = labelToHour24(best.hour.time)
    return Math.abs(evH - bestH) <= 1
  })

  const conditionLine = `${best.hour.temp}°F, ${best.hour.condition.toLowerCase()}${best.hour.pop > 10 ? `, ${best.hour.pop}% rain` : ''}${best.hour.wind > 15 ? `, ${best.hour.wind} mph winds` : ''}`

  let response = `Best time for a **${activity.label}**: **${best.hour.time}** — ${conditionLine}.`

  if (conflict) {
    response += `\n\n⚠️ Heads up: you have **"${conflict.title}"** around that time.`
  }

  if (second && second.score >= 45) {
    const c2 = `${second.hour.temp}°F${second.hour.pop > 10 ? `, ${second.hour.pop}% rain` : ''}`
    response += `\n\nAlso works: **${second.hour.time}** (${c2}).`
  }

  // Extra context
  if (activity.label === 'run' && best.hour.uv >= 7) {
    response += '\n\nUV is high at that hour — consider SPF if you\'re running outdoors.'
  }
  if (best.hour.pop > 20 && best.hour.pop <= 40) {
    response += '\n\nThere\'s a small chance of rain — worth bringing a light layer.'
  }

  return formatBold(response)
}
