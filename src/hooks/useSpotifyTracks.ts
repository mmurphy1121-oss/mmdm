import { useQuery } from '@tanstack/react-query'
import { getMoodProfile, fetchSpotifyTracks, fetchFromLikedSongs, type MoodProfile, type SpotifyTrack } from '@/lib/spotifyEngine'
import type { WeatherHour, CalendarEvent } from '@/data/mockData'

export function useSpotifyTracks(
  token: string | null,        // client-credentials token
  userToken: string | null,    // user OAuth token (liked songs)
  hourly: WeatherHour[],
  events: CalendarEvent[],
) {
  const profile: MoodProfile | null = hourly.length > 0 ? getMoodProfile(hourly, events) : null

  // Liked-songs query — only runs when user is logged in
  const likedQuery = useQuery<SpotifyTrack[]>({
    queryKey:  ['spotify-liked', userToken, profile?.vibe],
    queryFn:   () => fetchFromLikedSongs(userToken!, profile!),
    enabled:   !!(userToken && profile),
    staleTime: 30 * 60 * 1000,
    retry:     1,
  })

  // Anonymous query — runs when no user token but CC token available
  const anonQuery = useQuery<SpotifyTrack[]>({
    queryKey:  ['spotify-tracks', token, profile?.vibe],
    queryFn:   () => fetchSpotifyTracks(token!, profile!),
    enabled:   !!(token && profile && !userToken),
    staleTime: 30 * 60 * 1000,
  })

  // Prefer liked-songs result
  if (userToken) return { ...likedQuery, isFromLikedSongs: true }
  return { ...anonQuery, isFromLikedSongs: false }
}

export type { MoodProfile, SpotifyTrack }
