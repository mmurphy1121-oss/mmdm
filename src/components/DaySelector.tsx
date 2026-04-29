import { format, addDays, startOfDay, isToday } from 'date-fns'
import { getWeatherEmoji } from '@/lib/weatherEngine'

interface DaySelectorProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  dailyConditions?: Record<string, string>  // dateKey → condition
}

export default function DaySelector({ selectedDate, onDateChange, dailyConditions }: DaySelectorProps) {
  const today = startOfDay(new Date())
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const selectedKey = format(selectedDate, 'yyyy-MM-dd')

  return (
    <div className="bg-white/80 rounded-2xl p-3 shadow-sm border border-border/50">
      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const selected = key === selectedKey
          const condition = dailyConditions?.[key] ?? 'Clear'

          return (
            <button
              key={key}
              onClick={() => onDateChange(day)}
              className={`
                flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl
                transition-all text-sm font-medium min-w-[3.5rem]
                ${selected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}
              `}
            >
              <span className="text-xs uppercase tracking-wide">
                {isToday(day) ? 'Today' : format(day, 'EEE')}
              </span>
              <span className="text-xl leading-none">{getWeatherEmoji(condition)}</span>
              <span>{format(day, 'd')}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
