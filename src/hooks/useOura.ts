import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'

export interface OuraReadiness {
  score: number
  hrv_balance: number | null
  recovery_index: number | null
  resting_heart_rate: number | null
}

export interface OuraSleep {
  score: number
  total_sleep_duration: number   // seconds
  rem_sleep_duration: number     // seconds
  deep_sleep_duration: number    // seconds
  average_hrv: number | null
  efficiency: number | null
}

export interface OuraData {
  readiness: OuraReadiness | null
  sleep: OuraSleep | null
}

async function fetchOura(token: string): Promise<OuraData> {
  const today     = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const headers   = { Authorization: `Bearer ${token}` }

  const [readRes, sleepScoreRes, sleepSessionRes] = await Promise.all([
    fetch(`/oura-api/usercollection/daily_readiness?start_date=${today}&end_date=${today}`,   { headers }),
    fetch(`/oura-api/usercollection/daily_sleep?start_date=${today}&end_date=${today}`,       { headers }),
    fetch(`/oura-api/usercollection/sleep?start_date=${yesterday}&end_date=${today}`,         { headers }),
  ])

  const [readJson, sleepScoreJson, sleepSessionJson] = await Promise.all([
    readRes.ok          ? readRes.json()          : null,
    sleepScoreRes.ok    ? sleepScoreRes.json()    : null,
    sleepSessionRes.ok  ? sleepSessionRes.json()  : null,
  ])

  // Readiness — use today's record
  const readRaw = readJson?.data?.[0]
  const readiness: OuraReadiness | null = readRaw ? {
    score:               readRaw.score,
    hrv_balance:         readRaw.contributors?.hrv_balance ?? null,
    recovery_index:      readRaw.contributors?.recovery_index ?? null,
    resting_heart_rate:  readRaw.contributors?.resting_heart_rate ?? null,
  } : null

  // Sleep score — today's record
  const sleepScoreRaw = sleepScoreJson?.data?.[0]

  // Sleep session durations — find the most recent "long_sleep" session
  const sessions: Array<Record<string, unknown>> = sleepSessionJson?.data ?? []
  const longSleep = sessions
    .filter(s => s.type === 'long_sleep')
    .sort((a, b) => String(b.day ?? '').localeCompare(String(a.day ?? '')))
    [0] ?? sessions[sessions.length - 1]

  const sleep: OuraSleep | null = (sleepScoreRaw || longSleep) ? {
    score:                sleepScoreRaw?.score ?? 0,
    total_sleep_duration: Number(longSleep?.total_sleep_duration ?? 0),
    rem_sleep_duration:   Number(longSleep?.rem_sleep_duration   ?? 0),
    deep_sleep_duration:  Number(longSleep?.deep_sleep_duration  ?? 0),
    average_hrv:          longSleep?.average_hrv != null ? Number(longSleep.average_hrv) : null,
    efficiency:           longSleep?.efficiency  != null ? Number(longSleep.efficiency)  : null,
  } : null

  return { readiness, sleep }
}

export function useOura() {
  const env   = (import.meta as unknown as { env: Record<string, string | undefined> }).env
  const token = env.VITE_OURA_TOKEN

  return useQuery<OuraData>({
    queryKey:  ['oura', token],
    queryFn:   () => fetchOura(token!),
    enabled:   !!token,
    staleTime: 30 * 60 * 1000,
    retry:     1,
  })
}
