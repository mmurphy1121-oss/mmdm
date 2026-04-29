import { useQuery } from '@tanstack/react-query'
import { format, addDays, startOfDay } from 'date-fns'
import type { CalendarEvent } from '@/data/mockData'
import { parseICS } from '@/lib/icalParser'

const ICAL_URL = (import.meta as unknown as { env: Record<string, string | undefined> }).env
  .VITE_ICAL_URL

interface RawGoogleEvent {
  id: string
  summary?: string
  colorId?: string
  start: { dateTime?: string; date?: string }
  end:   { dateTime?: string; date?: string }
}

const EVENT_COLORS: Record<string, string> = {
  '1': '#a4bdfc', '2': '#7ae7bf', '3': '#dbadff',
  '4': '#ff887c', '5': '#fbd75b', '6': '#ffb878',
  '7': '#46d6db', '8': '#e1e1e1', '9': '#5484ed',
  '10': '#51b749', '11': '#dc2127',
}

function groupRawEvents(items: RawGoogleEvent[]): Record<string, CalendarEvent[]> {
  const byDate: Record<string, CalendarEvent[]> = {}
  const pad = (n: number) => String(n).padStart(2, '0')

  for (const ev of items) {
    if (!ev.start.dateTime) continue  // skip all-day
    const start   = new Date(ev.start.dateTime)
    const end     = ev.end.dateTime ? new Date(ev.end.dateTime) : start
    const dateKey = format(start, 'yyyy-MM-dd')

    const event: CalendarEvent = {
      id:        ev.id,
      title:     ev.summary || '(No title)',
      startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      endTime:   `${pad(end.getHours())}:${pad(end.getMinutes())}`,
      color:     ev.colorId ? EVENT_COLORS[ev.colorId] : '#3b82f6',
    }

    if (!byDate[dateKey]) byDate[dateKey] = []
    byDate[dateKey].push(event)
  }
  return byDate
}

async function fetchWeekEvents(
  token: string | null,
): Promise<Record<string, CalendarEvent[]>> {
  const byDate: Record<string, CalendarEvent[]> = {}
  const today   = startOfDay(new Date())
  const timeMin = today.toISOString()
  const timeMax = addDays(today, 7).toISOString()

  // ── Google Calendar ──────────────────────────────────────────────────────
  if (token) {
    const headers = { Authorization: `Bearer ${token}` }
    const listRes = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=50',
      { headers },
    )

    if (listRes.ok) {
      const listData = await listRes.json()
      const calIds: string[] = (listData.items ?? []).map((c: { id: string }) => c.id)

      const params = new URLSearchParams({
        timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '100',
      })

      const results = await Promise.allSettled(
        calIds.map(id =>
          fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events?${params}`,
            { headers },
          ).then(r => r.ok ? r.json() : { items: [] }),
        ),
      )

      for (const result of results) {
        if (result.status !== 'fulfilled') continue
        const grouped = groupRawEvents(result.value.items ?? [])
        for (const [dk, evs] of Object.entries(grouped)) {
          if (!byDate[dk]) byDate[dk] = []
          byDate[dk].push(...evs)
        }
      }
    }
  }

  // ── iCal (Apple Calendar) ────────────────────────────────────────────────
  if (ICAL_URL) {
    const url = ICAL_URL.replace(/^webcal:\/\//i, 'https://')
    try {
      let text: string
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error()
        text = await res.text()
      } catch {
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`)
        if (!res.ok) throw new Error()
        text = await res.text()
      }

      for (let i = 0; i < 7; i++) {
        const day = addDays(today, i)
        const dk  = format(day, 'yyyy-MM-dd')
        const evs = parseICS(text, day)
        if (evs.length > 0) {
          if (!byDate[dk]) byDate[dk] = []
          byDate[dk].push(...evs)
        }
      }
    } catch { /* silently skip */ }
  }

  // Deduplicate and sort each day
  for (const dk of Object.keys(byDate)) {
    const seen = new Set<string>()
    byDate[dk] = byDate[dk]
      .filter(ev => { const ok = !seen.has(ev.id); seen.add(ev.id); return ok })
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  return byDate
}

export function useWeekCalendar(providerToken: string | null) {
  return useQuery<Record<string, CalendarEvent[]>>({
    queryKey: ['week-calendar', providerToken, !!ICAL_URL],
    queryFn:  () => fetchWeekEvents(providerToken),
    enabled:  !!(providerToken || ICAL_URL),
    staleTime: 5 * 60 * 1000,
  })
}
