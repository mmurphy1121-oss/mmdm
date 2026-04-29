import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

interface SpotifyContextType {
  spotifyToken: string | null        // client-credentials (anonymous)
  userToken: string | null           // user OAuth token (liked songs access)
  isConnecting: boolean
  isUserConnecting: boolean
  error: string | null
  connectUser: () => void
  disconnectUser: () => void
}

const SpotifyContext = createContext<SpotifyContextType>({
  spotifyToken: null,
  userToken: null,
  isConnecting: false,
  isUserConnecting: false,
  error: null,
  connectUser: () => {},
  disconnectUser: () => {},
})

const LS_CC_TOKEN     = 'spotify_cc_token'
const LS_CC_EXPIRES   = 'spotify_cc_expires'
const LS_USER_TOKEN   = 'spotify_user_token'
const LS_USER_REFRESH = 'spotify_user_refresh'
const LS_USER_EXPIRES = 'spotify_user_expires'
const SS_VERIFIER     = 'spotify_pkce_verifier'

const REDIRECT_URI = window.location.origin
const SCOPES       = 'user-library-read user-top-read'

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function randomBase64url(len: number): string {
  const arr = crypto.getRandomValues(new Uint8Array(len))
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256Base64url(plain: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain))
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const env          = (import.meta as unknown as { env: Record<string, string | undefined> }).env
  const clientId     = env.VITE_SPOTIFY_CLIENT_ID
  const clientSecret = env.VITE_SPOTIFY_CLIENT_SECRET

  const [spotifyToken,     setSpotifyToken]     = useState<string | null>(null)
  const [userToken,        setUserToken]        = useState<string | null>(null)
  const [isConnecting,     setIsConnecting]     = useState(false)
  const [isUserConnecting, setIsUserConnecting] = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  // ── Client-credentials token (anonymous) ────────────────────────────────

  const fetchCCToken = useCallback(async () => {
    if (!clientId || !clientSecret) return
    const cached  = localStorage.getItem(LS_CC_TOKEN)
    const expires = Number(localStorage.getItem(LS_CC_EXPIRES) ?? 0)
    if (cached && Date.now() < expires - 60_000) { setSpotifyToken(cached); return }

    setIsConnecting(true)
    setError(null)
    try {
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: 'grant_type=client_credentials',
      })
      if (!res.ok) throw new Error(`Spotify auth failed: ${res.status}`)
      const data = await res.json()
      localStorage.setItem(LS_CC_TOKEN,   data.access_token)
      localStorage.setItem(LS_CC_EXPIRES, String(Date.now() + data.expires_in * 1000))
      setSpotifyToken(data.access_token)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsConnecting(false)
    }
  }, [clientId, clientSecret])

  useEffect(() => { fetchCCToken() }, [fetchCCToken])

  useEffect(() => {
    if (!spotifyToken) return
    const expires = Number(localStorage.getItem(LS_CC_EXPIRES) ?? 0)
    const delay   = expires - Date.now() - 60_000
    if (delay <= 0) return
    const t = setTimeout(fetchCCToken, delay)
    return () => clearTimeout(t)
  }, [spotifyToken, fetchCCToken])

  // ── User token refresh ────────────────────────────────────────────────────

  const refreshUserToken = useCallback(async () => {
    const refreshTok = localStorage.getItem(LS_USER_REFRESH)
    if (!refreshTok || !clientId || !clientSecret) return
    try {
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type:    'refresh_token',
          refresh_token: refreshTok,
        }).toString(),
      })
      if (!res.ok) return
      const data = await res.json()
      localStorage.setItem(LS_USER_TOKEN,   data.access_token)
      localStorage.setItem(LS_USER_EXPIRES, String(Date.now() + data.expires_in * 1000))
      if (data.refresh_token) localStorage.setItem(LS_USER_REFRESH, data.refresh_token)
      setUserToken(data.access_token)
    } catch { /* ignore */ }
  }, [clientId, clientSecret])

  // ── On mount: restore user token or handle OAuth callback ─────────────────

  useEffect(() => {
    // Try cached user token first
    const cached  = localStorage.getItem(LS_USER_TOKEN)
    const expires = Number(localStorage.getItem(LS_USER_EXPIRES) ?? 0)
    if (cached && Date.now() < expires - 60_000) {
      setUserToken(cached)
      return
    }

    // Check for PKCE callback code in URL
    const params   = new URLSearchParams(window.location.search)
    const code     = params.get('code')
    const verifier = sessionStorage.getItem(SS_VERIFIER)

    if (code && verifier && clientId) {
      setIsUserConnecting(true)
      window.history.replaceState({}, '', window.location.pathname) // clean URL

      fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type:    'authorization_code',
          code,
          redirect_uri:  REDIRECT_URI,
          client_id:     clientId,
          code_verifier: verifier,
        }).toString(),
      })
        .then(r => r.json())
        .then(data => {
          if (!data.access_token) throw new Error('No token in response')
          localStorage.setItem(LS_USER_TOKEN,   data.access_token)
          localStorage.setItem(LS_USER_EXPIRES, String(Date.now() + data.expires_in * 1000))
          if (data.refresh_token) localStorage.setItem(LS_USER_REFRESH, data.refresh_token)
          sessionStorage.removeItem(SS_VERIFIER)
          setUserToken(data.access_token)
        })
        .catch(() => setError('Spotify login failed — try again'))
        .finally(() => setIsUserConnecting(false))
      return
    }

    // Silently refresh if we have a refresh token
    if (localStorage.getItem(LS_USER_REFRESH)) {
      refreshUserToken()
    }
  }, [clientId, refreshUserToken])

  // Auto-refresh user token 5 min before expiry
  useEffect(() => {
    if (!userToken) return
    const expires = Number(localStorage.getItem(LS_USER_EXPIRES) ?? 0)
    const delay   = expires - Date.now() - 5 * 60_000
    if (delay <= 0) return
    const t = setTimeout(refreshUserToken, delay)
    return () => clearTimeout(t)
  }, [userToken, refreshUserToken])

  // ── Connect / disconnect ──────────────────────────────────────────────────

  const connectUser = useCallback(async () => {
    if (!clientId) return
    const verifier  = randomBase64url(64)
    const challenge = await sha256Base64url(verifier)
    sessionStorage.setItem(SS_VERIFIER, verifier)

    const authParams = new URLSearchParams({
      response_type:         'code',
      client_id:             clientId,
      scope:                 SCOPES,
      redirect_uri:          REDIRECT_URI,
      code_challenge_method: 'S256',
      code_challenge:        challenge,
    })
    window.location.href = `https://accounts.spotify.com/authorize?${authParams}`
  }, [clientId])

  const disconnectUser = useCallback(() => {
    localStorage.removeItem(LS_USER_TOKEN)
    localStorage.removeItem(LS_USER_REFRESH)
    localStorage.removeItem(LS_USER_EXPIRES)
    setUserToken(null)
  }, [])

  return (
    <SpotifyContext.Provider value={{
      spotifyToken, userToken,
      isConnecting, isUserConnecting,
      error,
      connectUser, disconnectUser,
    }}>
      {children}
    </SpotifyContext.Provider>
  )
}

export function useSpotify() { return useContext(SpotifyContext) }
