export interface WeatherHour {
  time: string       // e.g. "6 AM", "12 PM"
  temp: number       // °F
  feelsLike: number
  humidity: number   // %
  wind: number       // mph
  uv: number
  condition: string  // e.g. "Clear", "Rain"
  description: string
  pop: number        // precipitation probability 0–100
}

export interface DailySummary {
  date: string       // yyyy-MM-dd
  condition: string
  description: string
  high: number
  low: number
  pop: number
}

export interface CurrentWeather {
  temp: number
  feelsLike: number
  humidity: number
  wind: number
  uv: number
  condition: string
  description: string
  high: number
  low: number
}

export interface WeatherData {
  current: CurrentWeather
  hourly: WeatherHour[]              // today's hours
  hourlyByDate: Record<string, WeatherHour[]>
  daily: DailySummary[]
}

export interface GearItem {
  id: string
  label: string
  icon: string
  checked: boolean
}

export interface Insight {
  id: string
  type: 'warning' | 'tip' | 'info'
  message: string
}

export interface CalendarEvent {
  id: string
  title: string
  startTime: string   // "HH:mm" 24-hour
  endTime: string
  color?: string
  weatherContext?: string
}
