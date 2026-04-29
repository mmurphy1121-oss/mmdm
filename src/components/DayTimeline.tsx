import { Calendar } from 'lucide-react'
import type { CalendarEvent } from '@/data/mockData'

interface DayTimelineProps {
  events: CalendarEvent[]
  loading: boolean
  subtitle: string
}

function formatDisplayTime(t: string): string {
  const [hStr, mStr] = t.split(':')
  const h = parseInt(hStr, 10)
  const m = mStr === '00' ? '' : `:${mStr}`
  if (h === 0) return `12${m} AM`
  if (h === 12) return `12${m} PM`
  return h > 12 ? `${h - 12}${m} PM` : `${h}${m} AM`
}

export default function DayTimeline({ events, loading, subtitle }: DayTimelineProps) {
  return (
    <div className="bg-white/80 rounded-2xl p-4 shadow-sm border border-border/50">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Day Timeline
        </h3>
        <Calendar className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-1 rounded-full bg-muted self-stretch" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-4 w-40 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground text-sm py-2">No events scheduled.</p>
      ) : (
        <ol className="space-y-3">
          {events.map(ev => (
            <li key={ev.id} className="flex gap-3 items-start">
              {/* Color stripe */}
              <div
                className="w-1 rounded-full self-stretch min-h-[2.5rem] flex-shrink-0"
                style={{ backgroundColor: ev.color ?? '#3b82f6' }}
              />

              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  {formatDisplayTime(ev.startTime)}
                  {ev.endTime && ` – ${formatDisplayTime(ev.endTime)}`}
                </p>
                <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                {ev.weatherContext && (
                  <p className="text-xs text-amber-600 mt-0.5">{ev.weatherContext}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
