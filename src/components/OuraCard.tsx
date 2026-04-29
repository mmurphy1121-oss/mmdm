import { useOura } from '@/hooks/useOura'
import { Moon, Zap, Heart } from 'lucide-react'

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const radius = 28
  const circ   = 2 * Math.PI * radius
  const filled = (score / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/30" />
          <circle
            cx="36" cy="36" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={`${filled} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-foreground">
          {score}
        </span>
      </div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  )
}

function scoreColor(score: number): string {
  if (score >= 85) return '#22c55e'
  if (score >= 70) return '#f59e0b'
  return '#ef4444'
}

function scoreLabel(score: number): string {
  if (score >= 85) return 'Optimal'
  if (score >= 70) return 'Good'
  if (score >= 55) return 'Fair'
  return 'Pay attention'
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

export default function OuraCard() {
  const { data, isLoading, error } = useOura()
  const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env
  const hasToken = !!env.VITE_OURA_TOKEN

  if (!hasToken) {
    return (
      <div className="bg-white/80 rounded-2xl p-4 shadow-sm border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Moon className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sleep & Readiness</h3>
        </div>
        <p className="text-muted-foreground text-sm">
          Add <code className="text-xs bg-secondary px-1 py-0.5 rounded">VITE_OURA_TOKEN</code> to your{' '}
          <code className="text-xs bg-secondary px-1 py-0.5 rounded">.env.local</code> to connect your Oura ring.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white/80 rounded-2xl p-4 shadow-sm border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Moon className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sleep & Readiness</h3>
        </div>
        <div className="flex gap-6 animate-pulse">
          {[0, 1].map(i => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-16 h-16 rounded-full bg-muted" />
              <div className="h-3 w-14 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || (!data?.readiness && !data?.sleep)) {
    return (
      <div className="bg-white/80 rounded-2xl p-4 shadow-sm border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Moon className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sleep & Readiness</h3>
        </div>
        <p className="text-sm text-destructive">Couldn't load Oura data — check your token.</p>
      </div>
    )
  }

  const { readiness, sleep } = data!

  return (
    <div className="bg-white/80 rounded-2xl p-4 shadow-sm border border-border/50">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Moon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex-1">
          Sleep & Readiness
        </h3>
        <span className="text-xs text-muted-foreground">via Oura</span>
      </div>

      {/* Score rings */}
      <div className="flex gap-6 mb-4">
        {readiness && (
          <ScoreRing
            score={readiness.score}
            label="Readiness"
            color={scoreColor(readiness.score)}
          />
        )}
        {sleep && (
          <ScoreRing
            score={sleep.score}
            label="Sleep"
            color={scoreColor(sleep.score)}
          />
        )}
      </div>

      {/* Status line */}
      {readiness && (
        <p className="text-sm font-medium text-foreground mb-3">
          {scoreLabel(readiness.score)} — {
            readiness.score >= 85
              ? "you're recovered and ready to push hard today."
              : readiness.score >= 70
              ? "decent recovery — a moderate day is ideal."
              : "take it easy today and prioritize rest."
          }
        </p>
      )}

      {/* Sleep stats */}
      {sleep && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-secondary/40 rounded-xl p-2 text-center">
            <Moon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs font-semibold text-foreground">{fmtDuration(sleep.total_sleep_duration)}</p>
            <p className="text-[10px] text-muted-foreground">Total sleep</p>
          </div>
          <div className="bg-secondary/40 rounded-xl p-2 text-center">
            <Zap className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs font-semibold text-foreground">{fmtDuration(sleep.rem_sleep_duration)}</p>
            <p className="text-[10px] text-muted-foreground">REM sleep</p>
          </div>
          <div className="bg-secondary/40 rounded-xl p-2 text-center">
            <Heart className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs font-semibold text-foreground">
              {sleep.average_hrv ? `${Math.round(sleep.average_hrv)}` : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">HRV</p>
          </div>
        </div>
      )}
    </div>
  )
}
