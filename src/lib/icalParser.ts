import { format } from 'date-fns'
import type { CalendarEvent } from '@/data/mockData'

function parseICalDate(value: string): Date | null {
  // All-day (date-only): 20260415 — skip
  if (/^\d{8}$/.test(value)) return null

  const y  = value.slice(0, 4)
  const mo = value.slice(4, 6)
  const d  = value.slice(6, 8)
  const h  = value.slice(9, 11)
  const mi = value.slice(11, 13)
  const s  = value.slice(13, 15) || '00'

  // UTC: ends with Z
  if (value.endsWith('Z')) {
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`)
  }

  // Local / TZID — treat as local time
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`)
}

function unescapeIcal(s: string): string {
  return s.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/gi, ' ').replace(/\\\\/g, '\\')
}

export function parseICS(icsText: string, targetDate: Date): CalendarEvent[] {
  const targetDateStr = format(targetDate, 'yyyy-MM-dd')
  const events: CalendarEvent[] = []

  // Unfold multi-line values (RFC 5545 line folding)
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '')

  const eventBlocks = unfolded.split('BEGIN:VEVENT').slice(1)

  for (const block of eventBlocks) {
    const endIdx = block.indexOf('END:VEVENT')
    const lines = block.slice(0, endIdx).split(/\r?\n/).filter(Boolean)

    const props: Record<string, string> = {}

    for (const line of lines) {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      // Key may contain params: DTSTART;TZID=America/New_York — strip params for lookup
      const rawKey = line.slice(0, colonIdx)
      const key = rawKey.split(';')[0].toUpperCase()
      const value = line.slice(colonIdx + 1)
      props[key] = value
    }

    const uid     = props['UID']     || Math.random().toString(36)
    const summary = props['SUMMARY'] ? unescapeIcal(props['SUMMARY']) : '(No title)'
    const dtstart = props['DTSTART']
    const dtend   = props['DTEND']

    if (!dtstart) continue

    const startDate = parseICalDate(dtstart)
    if (!startDate) continue // all-day

    if (format(startDate, 'yyyy-MM-dd') !== targetDateStr) continue

    const endDate = dtend ? parseICalDate(dtend) : null
    const pad = (n: number) => String(n).padStart(2, '0')

    events.push({
      id: uid,
      title: summary,
      startTime: `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`,
      endTime: endDate
        ? `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`
        : `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`,
    })
  }

  return events.sort((a, b) => a.startTime.localeCompare(b.startTime))
}
