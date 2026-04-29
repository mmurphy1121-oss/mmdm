import { AlertTriangle, Lightbulb, Info } from 'lucide-react'
import type { Insight } from '@/data/mockData'

interface SmartInsightProps {
  insights: Insight[]
  loading: boolean
}

const TYPE_CONFIG = {
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon_color: 'text-amber-500',
    text: 'text-amber-900',
  },
  tip: {
    icon: Lightbulb,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon_color: 'text-emerald-500',
    text: 'text-emerald-900',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon_color: 'text-blue-500',
    text: 'text-blue-900',
  },
}

export default function SmartInsight({ insights, loading }: SmartInsightProps) {
  return (
    <div className="bg-white/80 rounded-2xl p-4 shadow-sm border border-border/50">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Smart Insights
      </h3>

      {loading ? (
        <div className="space-y-2.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-2 animate-pulse">
              <div className="w-5 h-5 rounded bg-muted flex-shrink-0" />
              <div className="h-4 flex-1 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : insights.length === 0 ? (
        <p className="text-muted-foreground text-sm">All clear — great weather today!</p>
      ) : (
        <ul className="space-y-2">
          {insights.map(insight => {
            const cfg = TYPE_CONFIG[insight.type]
            const Icon = cfg.icon
            return (
              <li
                key={insight.id}
                className={`flex gap-2.5 items-start rounded-xl p-2.5 border ${cfg.bg} ${cfg.border}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.icon_color}`} />
                <span className={`text-sm leading-snug ${cfg.text}`}>{insight.message}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
