import type { WeatherHour, CalendarEvent } from '@/data/mockData'

export interface MoodProfile {
  vibe: string           // shown in the UI, e.g. "Party mode 🎉"
  searchQuery: string    // Spotify search query
  genres: string[]       // seed genres for recommendations endpoint
  energy: number         // 0–1
  valence: number        // 0–1
  danceability: number   // 0–1
  minTempo?: number
}

export interface SpotifyTrack {
  id: string
  name: string
  artist: string
  albumArt: string
  spotifyUrl: string
}

// ── Event keyword matchers ────────────────────────────────────────────────────

const PARTY_RE    = /party|parties|celebration|birthday|wedding|gala|cocktail|reception|happy hour|event/i
const WORKOUT_RE  = /run|jog|gym|workout|yoga|spin|hike|bike|cycle|exercise|class|practice|training|swim|row/i
const DINNER_RE   = /dinner|lunch|brunch|date night|restaurant|cafe|coffee/i
const MORNING_RE  = /morning|sunrise|commute/i
const FOCUS_RE    = /work|study|focus|meeting|standup|class|lecture|seminar|exam/i

// ── Main mood mapper ──────────────────────────────────────────────────────────

export function getMoodProfile(
  hourly: WeatherHour[],
  events: CalendarEvent[],
): MoodProfile {
  if (hourly.length === 0) {
    return { vibe: 'Chill vibes ✨', searchQuery: 'feel good chill', genres: ['pop'], energy: 0.5, valence: 0.6, danceability: 0.5 }
  }

  const maxTemp  = Math.max(...hourly.map(h => h.temp))
  const minTemp  = Math.min(...hourly.map(h => h.temp))
  const hasRain  = hourly.some(h => h.pop > 45)
  const isCold   = maxTemp < 45
  const isWarm   = maxTemp >= 70
  const isSunny  = hourly.some(h => h.condition === 'Clear' || h.condition === 'Mostly Clear')
  const isStormy = hourly.some(h => h.condition.toLowerCase().includes('thunder'))

  const titles   = events.map(e => e.title).join(' ')

  // Priority: specific events override weather

  if (PARTY_RE.test(titles)) {
    return {
      vibe: 'Party mode 🎉',
      searchQuery: 'party hits pop edm 2024',
      genres: ['pop', 'dance', 'edm'],
      energy: 0.92, valence: 0.9, danceability: 0.92,
    }
  }

  if (WORKOUT_RE.test(titles)) {
    return {
      vibe: 'Workout energy 🏃',
      searchQuery: 'workout motivation pump up 2024',
      genres: ['hip-hop', 'electronic', 'work-out'],
      energy: 0.95, valence: 0.72, danceability: 0.82,
      minTempo: 120,
    }
  }

  if (DINNER_RE.test(titles) && isWarm && !hasRain) {
    return {
      vibe: 'Dinner out 🍽️',
      searchQuery: 'dinner jazz lounge smooth',
      genres: ['jazz', 'soul', 'r-n-b'],
      energy: 0.45, valence: 0.65, danceability: 0.5,
    }
  }

  if (FOCUS_RE.test(titles)) {
    return {
      vibe: 'Focus mode 🎧',
      searchQuery: 'focus instrumental study lo-fi',
      genres: ['study', 'classical', 'ambient'],
      energy: 0.35, valence: 0.5, danceability: 0.25,
    }
  }

  // Weather-driven profiles

  if (isStormy) {
    return {
      vibe: 'Stormy & dramatic ⛈️',
      searchQuery: 'dark indie alternative storm',
      genres: ['alternative', 'indie', 'rock'],
      energy: 0.65, valence: 0.35, danceability: 0.4,
    }
  }

  if (hasRain && isCold) {
    return {
      vibe: 'Cozy rainy day 🌧️',
      searchQuery: 'rainy day acoustic cozy indie',
      genres: ['indie', 'folk', 'acoustic'],
      energy: 0.28, valence: 0.42, danceability: 0.28,
    }
  }

  if (hasRain && !isCold) {
    return {
      vibe: 'Rainy vibes ☔',
      searchQuery: 'rain vibes chill indie pop',
      genres: ['indie-pop', 'pop', 'indie'],
      energy: 0.42, valence: 0.5, danceability: 0.4,
    }
  }

  if (isCold && !hasRain) {
    return {
      vibe: 'Cold & cozy ❄️',
      searchQuery: 'cozy winter acoustic coffee shop',
      genres: ['folk', 'acoustic', 'singer-songwriter'],
      energy: 0.32, valence: 0.55, danceability: 0.3,
    }
  }

  if (isWarm && isSunny) {
    return {
      vibe: 'Sunny & bright ☀️',
      searchQuery: 'sunny day feel good pop summer',
      genres: ['pop', 'indie-pop', 'tropical'],
      energy: 0.78, valence: 0.88, danceability: 0.75,
    }
  }

  if (isWarm) {
    return {
      vibe: 'Warm & good vibes 🌤️',
      searchQuery: 'good vibes chill pop indie',
      genres: ['pop', 'indie-pop'],
      energy: 0.65, valence: 0.75, danceability: 0.62,
    }
  }

  // Mild / overcast default
  return {
    vibe: 'Mellow & smooth 🌥️',
    searchQuery: 'mellow chill indie pop smooth',
    genres: ['indie', 'pop'],
    energy: 0.52, valence: 0.6, danceability: 0.5,
  }
}

// ── Spotify API helpers ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTrack(t: any): SpotifyTrack {
  return {
    id:         t.id,
    name:       t.name,
    artist:     t.artists?.[0]?.name ?? 'Unknown',
    albumArt:   t.album?.images?.[1]?.url ?? t.album?.images?.[0]?.url ?? '',
    spotifyUrl: t.external_urls?.spotify ?? '',
  }
}

// Score a track's audio features against the mood profile (0–100)
function moodScore(
  features: { energy: number; valence: number; danceability: number; tempo?: number },
  profile: MoodProfile,
): number {
  const diff =
    Math.abs(features.energy      - profile.energy)      * 40 +
    Math.abs(features.valence     - profile.valence)      * 40 +
    Math.abs(features.danceability - profile.danceability) * 20
  return Math.max(0, Math.round(100 - diff * 100))
}

// ── Liked-songs path (requires user token) ────────────────────────────────────

export async function fetchFromLikedSongs(
  userToken: string,
  profile: MoodProfile,
): Promise<SpotifyTrack[]> {
  const headers = { Authorization: `Bearer ${userToken}` }

  // Fetch up to 50 liked songs at a random offset for variety
  const totalRes  = await fetch('https://api.spotify.com/v1/me/tracks?limit=1', { headers })
  if (!totalRes.ok) throw new Error('Could not fetch liked songs')
  const totalData = await totalRes.json()
  const total: number = totalData.total ?? 0
  if (total === 0) throw new Error('No liked songs found')

  // Pick a random window of 50 tracks
  const maxOffset = Math.max(0, total - 50)
  const offset    = Math.floor(Math.random() * maxOffset)

  const likedRes  = await fetch(
    `https://api.spotify.com/v1/me/tracks?limit=50&offset=${offset}`,
    { headers },
  )
  if (!likedRes.ok) throw new Error('Failed to load liked songs')
  const likedData = await likedRes.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tracks: any[] = (likedData.items ?? []).map((i: any) => i.track).filter(Boolean)
  if (tracks.length === 0) throw new Error('No tracks in liked songs batch')

  // Fetch audio features for all tracks in one call
  const ids      = tracks.map(t => t.id).join(',')
  const featRes  = await fetch(
    `https://api.spotify.com/v1/audio-features?ids=${ids}`,
    { headers },
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const featData = featRes.ok ? await featRes.json() : { audio_features: [] as any[] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const features: any[] = featData.audio_features ?? []

  // Score each track and sort
  const scored = tracks
    .map((track, i) => ({
      track,
      score: features[i]
        ? moodScore(features[i], profile)
        : 50, // neutral score if features missing
    }))
    .sort((a, b) => b.score - a.score)

  // Return the top 3 best-matching liked songs
  return scored.slice(0, 3).map(s => mapTrack(s.track))
}

// ── Anonymous path (client credentials) ──────────────────────────────────────

export async function fetchSpotifyTracks(
  token: string,
  profile: MoodProfile,
): Promise<SpotifyTrack[]> {
  const headers = { Authorization: `Bearer ${token}` }

  // 1. Try recommendations endpoint
  try {
    const params = new URLSearchParams({
      seed_genres:         profile.genres.slice(0, 2).join(','),
      target_energy:       String(profile.energy),
      target_valence:      String(profile.valence),
      target_danceability: String(profile.danceability),
      limit:               '3',
    })
    if (profile.minTempo) params.set('min_tempo', String(profile.minTempo))

    const res = await fetch(`https://api.spotify.com/v1/recommendations?${params}`, { headers })
    if (res.ok) {
      const data = await res.json()
      const tracks: SpotifyTrack[] = (data.tracks ?? []).slice(0, 3).map(mapTrack)
      if (tracks.length > 0) return tracks
    }
  } catch { /* fall through to search */ }

  // 2. Fallback: search
  const q   = encodeURIComponent(profile.searchQuery)
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${q}&type=track&limit=10`,
    { headers },
  )
  if (!res.ok) throw new Error(`Spotify search error ${res.status}`)
  const data = await res.json()
  return (data.tracks?.items ?? []).slice(0, 3).map(mapTrack)
}
