import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import type { CalendarEvent } from '@/data/mockData'
import { parseICS } from '@/lib/icalParser'

const ICAL_URL = (import.meta as unknown as { env: Record<string, string | undefined> }).env
  .VITE_ICAL_URL

async function fetchICS(rawUrl: string, targetDate: Date): Promise<CalendarEvent[]> {
  const url = rawUrl.replace(/^webcal:\/\//i, 'https://')

  const proxies = [
    (u: string) => fetch(u),
    (u: string) => fetch(`https://corsproxy.io/?${encodeURIComponent(u)}`),
    (u: string) => fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`),
    (u: string) => fetch(`https://thingproxy.freeboard.io/fetch/${u}`),
  ]

  for (const attempt of proxies) {
    try {
      const res = await attempt(url)
      if (!res.ok) continue
      const text = await res.text()
      if (text.includes('BEGIN:VCALENDAR')) return parseICS(text, targetDate)
    } catch { /* try next */ }
  }

  throw new Error('Could not load Apple Calendar — all proxies failed')
}

export function useExternalCalendar(selectedDate: Date) {
  const dateKey = format(selectedDate, 'yyyy-MM-dd')

  return useQuery<CalendarEvent[]>({
    queryKey: ['external-calendar', dateKey],
    queryFn: () => fetchICS(ICAL_URL!, selectedDate),
    enabled: !!ICAL_URL,
    staleTime: 5 * 60 * 1000,
  })
}
