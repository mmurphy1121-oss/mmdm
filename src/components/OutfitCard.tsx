import { Shirt } from 'lucide-react'
import type { OutfitRecommendation } from '@/lib/weatherEngine'

interface OutfitCardProps {
  outfit: OutfitRecommendation | null
  loading: boolean
}

export default function OutfitCard({ outfit, loading }: OutfitCardProps) {
  return (
    <div className="bg-white/80 rounded-2xl p-4 shadow-sm border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          What to Wear
        </h3>
        <Shirt className="w-4 h-4 text-muted-foreground" />
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-6 h-6 rounded bg-muted" />
              <div className="h-4 flex-1 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : !outfit || outfit.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">No recommendation available.</p>
      ) : (
        <div className="space-y-3">
          {/* Summary badge */}
          <p className="text-sm font-medium text-foreground">{outfit.summary}</p>

          {/* Item list */}
          <ul className="space-y-2">
            {outfit.items.map((item, i) => (
              <li key={i} className="flex items-center gap-2.5">
                <span className="text-xl leading-none w-7 text-center flex-shrink-0">
                  {item.icon}
                </span>
                <span className="text-sm text-foreground">{item.label}</span>
              </li>
            ))}
          </ul>

          {/* Evening tip */}
          {outfit.tip && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-800 leading-snug">
              💡 {outfit.tip}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
