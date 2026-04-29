import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import type { CalendarEvent } from '@/data/mockData'
import { parseICS } from '@/lib/icalParser'

const ICAL_URL = (import.meta as unknown as { env: Record<string, string | undefined> }).env
  .VITE_ICAL_URL

async function fetchICS(rawUrl: string, targetDate: Date): Promise<CalendarEvent[]> {
  const url = rawUrl.replace(/^webcal:\/\//i, 'https://')

  // Try direct fetch first; fall back to CORS proxy if blocked
  let text: string
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`status ${res.status}`)
    text = await res.text()
  } catch {
    const proxy = `https://corsproxy.io/?${encodeURIComponent(url)}`
    const res = await fetch(proxy)
    if (!res.ok) throw new Error(`proxy status ${res.status}`)
    text = await res.text()
  }

  return parseICS(text, targetDate)
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
