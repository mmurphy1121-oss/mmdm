import { format } from 'date-fns'
import { Droplets, Wind, Thermometer, Sun } from 'lucide-react'
import { getWeatherEmoji, uvLabel } from '@/lib/weatherEngine'

interface Current {
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

interface HeroHeaderProps {
  current?: Current
  loading: boolean
  cityName: string
  date: Date
  uvRange?: { min: number; max: number }
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/30 ${className}`} />
}

const UV_COLOR: Record<string, string> = {
  'Low':       'text-green-300',
  'Moderate':  'text-yellow-300',
  'High':      'text-orange-300',
  'Very High': 'text-red-300',
  'Extreme':   'text-purple-300',
}

export default function HeroHeader({ current, loading, cityName, date, uvRange }: HeroHeaderProps) {
  if (loading || !current) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-6 shadow-lg text-white">
        <div className="flex items-start justify-between mb-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-44" />
          </div>
          <Skeleton className="h-14 w-14 rounded-full" />
        </div>
        <Skeleton className="h-20 w-40 mb-2" />
        <Skeleton className="h-4 w-28 mb-6" />
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const emoji    = getWeatherEmoji(current.condition)
  const peakUV   = uvRange?.max ?? current.uv
  const uvDesc   = uvLabel(peakUV)
  const uvColor  = UV_COLOR[uvDesc] ?? 'text-blue-200'
  const uvValue  = uvRange ? `${uvRange.min}–${uvRange.max}` : String(current.uv)

  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-6 shadow-lg text-white">
      {/* Location + date */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-blue-100 text-sm">{format(date, 'EEEE, MMMM d')}</p>
          <h2 className="text-xl font-semibold">{cityName}</h2>
        </div>
        <span className="text-5xl leading-none">{emoji}</span>
      </div>

      {/* Temperature */}
      <div className="flex items-end gap-3 mt-3 mb-1">
        <span className="text-8xl font-thin leading-none">{current.temp}°</span>
        <div className="mb-2">
          <p className="text-blue-100 font-medium">{current.condition}</p>
          <p className="text-blue-200 text-sm">{current.description}</p>
        </div>
      </div>

      {/* High / low */}
      <p className="text-blue-200 text-sm mb-4">
        H: {current.high}° &middot; L: {current.low}°
      </p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 bg-white/10 rounded-xl p-3">
        <StatItem icon={<Thermometer className="w-4 h-4" />} label="Feels" value={`${current.feelsLike}°`} />
        <StatItem icon={<Droplets className="w-4 h-4" />} label="Humidity" value={`${current.humidity}%`} />
        <StatItem icon={<Wind className="w-4 h-4" />} label="Wind" value={`${current.wind} mph`} />
        <StatItem
          icon={<Sun className="w-4 h-4" />}
          label="UV Index"
          value={uvValue}
          sub={<span className={`text-xs font-medium ${uvColor}`}>{uvDesc}</span>}
        />
      </div>
    </div>
  )
}

function StatItem({
  icon, label, value, sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <span className="text-blue-200">{icon}</span>
      <span className="text-xs text-blue-200">{label}</span>
      <span className="text-sm font-semibold leading-tight">{value}</span>
      {sub && <span className="leading-tight">{sub}</span>}
    </div>
  )
}
