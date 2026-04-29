import { useState } from 'react'
import type { GearItem } from '@/data/mockData'

interface GearChecklistProps {
  items: GearItem[]
  loading: boolean
}

export default function GearChecklist({ items, loading }: GearChecklistProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div className="bg-white/80 rounded-2xl p-4 shadow-sm border border-border/50">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        What to Bring
      </h3>

      {loading ? (
        <div className="space-y-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-5 h-5 rounded bg-muted" />
              <div className="h-4 flex-1 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing special needed today!</p>
      ) : (
        <ul className="space-y-2">
          {items.map(item => {
            const isChecked = checked.has(item.id)
            return (
              <li key={item.id}>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(item.id)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-lg leading-none">{item.icon}</span>
                  <span
                    className={`text-sm transition-colors ${
                      isChecked ? 'line-through text-muted-foreground' : 'text-foreground'
                    }`}
                  >
                    {item.label}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
