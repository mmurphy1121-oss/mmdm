import { getWeatherEmoji } from '@/lib/weatherEngine'
import type { WeatherHour } from '@/data/mockData'

interface HourlyForecastProps {
  hourly: WeatherHour[]
  loading: boolean
}

function Skeleton() {
  return (
    <div className="flex-shrink-0 w-16 flex flex-col items-center gap-2 animate-pulse">
      <div className="h-3 w-10 bg-muted rounded" />
      <div className="h-8 w-8 bg-muted rounded-full" />
      <div className="h-4 w-8 bg-muted rounded" />
      <div className="h-3 w-6 bg-muted rounded" />
    </div>
  )
}

export default function HourlyForecast({ hourly, loading }: HourlyForecastProps) {
  return (
    <div className="bg-white/80 rounded-2xl p-4 shadow-sm border border-border/50">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Hourly
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {loading
          ? [...Array(8)].map((_, i) => <Skeleton key={i} />)
          : hourly.length === 0
          ? <p className="text-muted-foreground text-sm py-2">No hourly data available.</p>
          : hourly.map(hour => (
              <HourCard key={hour.time} hour={hour} />
            ))}
      </div>
    </div>
  )
}

function HourCard({ hour }: { hour: WeatherHour }) {
  return (
    <div className="flex-shrink-0 flex flex-col items-center gap-1 min-w-[3.5rem]">
      <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">{hour.time}</span>
      <span className="text-2xl leading-none">{getWeatherEmoji(hour.condition)}</span>
      <span className="text-sm font-semibold text-foreground">{hour.temp}°</span>
      {hour.pop > 0 && (
        <span className="text-xs text-blue-500 font-medium">{hour.pop}%</span>
      )}
    </div>
  )
}
