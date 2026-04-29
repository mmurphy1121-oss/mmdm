import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import type { CalendarEvent } from '@/data/mockData'

interface GoogleEvent {
  id: string
  summary?: string
  colorId?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
}

const EVENT_COLORS: Record<string, string> = {
  '1': '#a4bdfc', '2': '#7ae7bf', '3': '#dbadff',
  '4': '#ff887c', '5': '#fbd75b', '6': '#ffb878',
  '7': '#46d6db', '8': '#e1e1e1', '9': '#5484ed',
  '10': '#51b749', '11': '#dc2127',
}

function parseGoogleEvents(items: GoogleEvent[]): CalendarEvent[] {
  return items
    .filter(ev => ev.start.dateTime)
    .map(ev => {
      const start = new Date(ev.start.dateTime!)
      const end   = new Date(ev.end.dateTime!)
      const pad   = (n: number) => String(n).padStart(2, '0')
      return {
        id:        ev.id,
        title:     ev.summary || '(No title)',
        startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
        endTime:   `${pad(end.getHours())}:${pad(end.getMinutes())}`,
        color:     ev.colorId ? EVENT_COLORS[ev.colorId] : '#3b82f6',
      }
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

async function fetchAllCalendarEvents(
  token: string,
  date: Date,
): Promise<CalendarEvent[]> {
  const headers = { Authorization: `Bearer ${token}` }

  // 1. Get all calendars the user has
  const listRes = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=50',
    { headers },
  )
  if (!listRes.ok) throw new Error(`Calendar list error ${listRes.status}`)
  const listData = await listRes.json()
  const calendarIds: string[] = (listData.items ?? []).map((c: { id: string }) => c.id)

  // 2. Fetch events from all calendars in parallel
  const dateStr    = format(date, 'yyyy-MM-dd')
  const timeMin    = new Date(`${dateStr}T00:00:00`).toISOString()
  const timeMax    = new Date(`${dateStr}T23:59:59`).toISOString()
  const params     = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy:      'startTime',
    maxResults:   '50',
  })

  const results = await Promise.allSettled(
    calendarIds.map(id =>
      fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events?${params}`,
        { headers },
      ).then(r => r.ok ? r.json() : Promise.resolve({ items: [] })),
    ),
  )

  const allEvents: CalendarEvent[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allEvents.push(...parseGoogleEvents(result.value.items ?? []))
    }
  }

  // Deduplicate by id and sort
  const seen = new Set<string>()
  return allEvents
    .filter(ev => { const ok = !seen.has(ev.id); seen.add(ev.id); return ok })
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export function useCalendar(providerToken: string | null, selectedDate?: Date) {
  const date = selectedDate ?? new Date()

  return useQuery<CalendarEvent[]>({
    queryKey: ['calendar', providerToken, format(date, 'yyyy-MM-dd')],
    queryFn:  () => fetchAllCalendarEvents(providerToken!, date),
    enabled:  !!providerToken,
    staleTime: 5 * 60 * 1000,
  })
}
