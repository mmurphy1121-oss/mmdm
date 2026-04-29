import { Sparkles } from 'lucide-react'
import { getWeatherEmoji } from '@/lib/weatherEngine'
import type { ScheduleOptimization, OuraNudge } from '@/lib/weatherEngine'

interface ScheduleOptimizerProps {
  optimizations: ScheduleOptimization[]
  nudges: OuraNudge[]
  loading: boolean
  hasCalendar: boolean
}

function conditionEmoji(condition: string) {
  return getWeatherEmoji(condition.split(',')[0])
}

export default function ScheduleOptimizer({
  optimizations,
  nudges,
  loading,
  hasCalendar,
}: ScheduleOptimizerProps) {
  const hasContent = optimizations.length > 0 || nudges.length > 0

  return (
    <div className="bg-white/80 rounded-2xl p-4 shadow-sm border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Schedule Optimizer
        </h3>
        <Sparkles className="w-4 h-4 text-primary" />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="h-4 w-40 bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : !hasCalendar && nudges.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Connect your calendar to get smart scheduling suggestions based on the forecast.
        </p>
      ) : !hasContent ? (
        <p className="text-muted-foreground text-sm">
          Your schedule looks well-matched to the weather this week 🎉
        </p>
      ) : (
        <ul className="divide-y divide-border/40">
          {/* Oura nudges first */}
          {nudges.map(nudge => (
            <li key={nudge.id} className="py-3 first:pt-0 last:pb-0 flex gap-2.5">
              <span className="text-base leading-none mt-0.5 flex-shrink-0">
                {nudge.type === 'boost' ? '⚡' : nudge.type === 'rest' ? '🛌' : 'ℹ️'}
              </span>
              <p className="text-sm text-foreground leading-snug">{nudge.message}</p>
            </li>
          ))}

          {/* Weather-based rescheduling suggestions */}
          {optimizations.map(opt => (
            <li key={opt.id} className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm font-semibold text-foreground mb-0.5">
                {opt.eventTitle}
              </p>
              <p className="text-sm text-muted-foreground leading-snug">
                {opt.reason}.{' '}
                <span className="text-foreground font-medium">
                  {opt.betterDateLabel}
                </span>{' '}
                looks much better —{' '}
                <span className="text-foreground">
                  {conditionEmoji(opt.betterCondition)} {opt.betterCondition}
                </span>.
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
