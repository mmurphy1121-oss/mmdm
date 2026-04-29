import { useSpotify } from '@/contexts/SpotifyContext'
import { useSpotifyTracks } from '@/hooks/useSpotifyTracks'
import type { WeatherHour, CalendarEvent } from '@/data/mockData'
import { getMoodProfile } from '@/lib/spotifyEngine'
import { ExternalLink, Music, Heart } from 'lucide-react'

interface SpotifyCardProps {
  hourly: WeatherHour[]
  events: CalendarEvent[]
  loading: boolean
}

function SpotifyLogo() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  )
}

export default function SpotifyCard({ hourly, events, loading }: SpotifyCardProps) {
  const { spotifyToken, userToken, isConnecting, isUserConnecting, error: spotifyError, connectUser, disconnectUser } = useSpotify()
  const { data: tracks, isLoading: tracksLoading, error } = useSpotifyTracks(spotifyToken, userToken, hourly, events)
  const profile      = hourly.length > 0 ? getMoodProfile(hourly, events) : null
  const isLoadingAll = loading || tracksLoading || isConnecting || isUserConnecting
  const noConfig     = !spotifyToken && !isConnecting && !spotifyError

  return (
    <div className="bg-white/80 rounded-2xl p-4 shadow-sm border border-border/50">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Music className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex-1">
          Today's Soundtrack
        </h3>
        {spotifyToken && (
          <span className="flex items-center gap-1 text-xs text-[#1DB954] font-medium">
            <SpotifyLogo /> Spotify
          </span>
        )}
      </div>

      {/* Not configured */}
      {noConfig && (
        <p className="text-muted-foreground text-sm">
          Add <code className="text-xs bg-secondary px-1 py-0.5 rounded">VITE_SPOTIFY_CLIENT_SECRET</code> to your{' '}
          <code className="text-xs bg-secondary px-1 py-0.5 rounded">.env.local</code> to enable song recommendations.
        </p>
      )}

      {/* Auth error */}
      {spotifyError && (
        <p className="text-sm text-destructive">{spotifyError}</p>
      )}

      {/* Connect liked songs banner */}
      {spotifyToken && !userToken && !isUserConnecting && (
        <div className="mb-3 flex items-center justify-between gap-2 bg-[#1DB954]/10 rounded-xl px-3 py-2">
          <p className="text-xs text-foreground">
            <Heart className="w-3 h-3 inline mr-1 text-[#1DB954]" />
            Connect to pick from your liked songs
          </p>
          <button
            onClick={connectUser}
            className="text-xs font-semibold text-[#1DB954] hover:underline flex-shrink-0"
          >
            Connect
          </button>
        </div>
      )}

      {/* User connecting spinner */}
      {isUserConnecting && (
        <p className="text-xs text-muted-foreground mb-3 animate-pulse">Connecting to Spotify…</p>
      )}

      {/* Connected badge */}
      {userToken && (
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-[#1DB954] flex items-center gap-1">
            <Heart className="w-3 h-3" /> From your liked songs
          </p>
          <button onClick={disconnectUser} className="text-xs text-muted-foreground hover:text-foreground">
            Disconnect
          </button>
        </div>
      )}

      {/* Vibe label */}
      {spotifyToken && profile && !isLoadingAll && (
        <p className="text-sm font-medium text-foreground mb-3">{profile.vibe}</p>
      )}

      {/* Loading skeletons */}
      {isLoadingAll && spotifyToken && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-36 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Track fetch error */}
      {error && <p className="text-sm text-destructive">Couldn't load tracks — check your Spotify credentials.</p>}

      {/* Tracks */}
      {spotifyToken && !isLoadingAll && !error && tracks && tracks.length > 0 && (
        <ul className="space-y-2">
          {tracks.map((track, i) => (
            <li key={track.id}>
              <a
                href={track.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 group rounded-xl p-1.5 -mx-1.5 hover:bg-secondary/50 transition-colors"
              >
                {track.albumArt ? (
                  <img src={track.albumArt} alt={track.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 shadow-sm" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center text-lg">🎵</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate leading-tight">{i + 1}. {track.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </a>
            </li>
          ))}
        </ul>
      )}

      {spotifyToken && !isLoadingAll && !error && tracks?.length === 0 && (
        <p className="text-sm text-muted-foreground">No tracks found — try again later.</p>
      )}
    </div>
  )
}
