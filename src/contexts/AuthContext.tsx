import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

interface User {
  email: string
  name?: string
}

interface AuthContextType {
  user: User | null
  providerToken: string | null
  signInWithGoogle: () => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  providerToken: null,
  signInWithGoogle: () => {},
  signOut: () => {},
})

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            prompt?: string
            callback: (response: { access_token?: string; error?: string }) => void
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void }
          revoke: (token: string, done?: () => void) => void
        }
      }
    }
  }
}

const LS_USER         = 'google_user'
const LS_USER_EXPIRY  = 'google_user_expiry'
const LS_TOKEN        = 'google_token'
const LS_TOKEN_EXPIRY = 'google_token_expiry'
const USER_TTL_MS     = 24 * 60 * 60 * 1000   // 1 day
const TOKEN_TTL_MS    = 55 * 60 * 1000         // 55 min (tokens last 60)

function loadCachedUser(): User | null {
  try {
    const expiry = Number(localStorage.getItem(LS_USER_EXPIRY) ?? 0)
    if (Date.now() > expiry) return null
    const raw = localStorage.getItem(LS_USER)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function loadCachedToken(): string | null {
  const expiry = Number(localStorage.getItem(LS_TOKEN_EXPIRY) ?? 0)
  if (Date.now() > expiry) return null
  return localStorage.getItem(LS_TOKEN)
}

function saveUser(user: User) {
  localStorage.setItem(LS_USER, JSON.stringify(user))
  localStorage.setItem(LS_USER_EXPIRY, String(Date.now() + USER_TTL_MS))
}

function saveToken(token: string) {
  localStorage.setItem(LS_TOKEN, token)
  localStorage.setItem(LS_TOKEN_EXPIRY, String(Date.now() + TOKEN_TTL_MS))
}

function clearStorage() {
  localStorage.removeItem(LS_USER)
  localStorage.removeItem(LS_USER_EXPIRY)
  localStorage.removeItem(LS_TOKEN)
  localStorage.removeItem(LS_TOKEN_EXPIRY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                   = useState<User | null>(loadCachedUser)
  const [providerToken, setProviderToken] = useState<string | null>(loadCachedToken)

  const clientId = (import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_GOOGLE_CLIENT_ID

  // Build (or reuse) a token client and request a token.
  // silent=true → no consent screen; fails quietly if Google session is gone.
  const requestToken = useCallback((silent: boolean, onSuccess?: () => void) => {
    if (!clientId || !window.google?.accounts?.oauth2) return
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ].join(' '),
      callback: async response => {
        if (response.error || !response.access_token) return
        const token = response.access_token
        saveToken(token)
        setProviderToken(token)

        // Fetch user info if we don't have a cached user yet
        if (!loadCachedUser()) {
          try {
            const res  = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json()
            const u    = { email: data.email, name: data.name }
            saveUser(u)
            setUser(u)
          } catch {
            const u = { email: 'Google User' }
            saveUser(u)
            setUser(u)
          }
        }
        onSuccess?.()
      },
    })
    tokenClient.requestAccessToken({ prompt: silent ? '' : 'consent' })
  }, [clientId])

  // Load the GIS script then call requestToken
  const loadGisAndRequest = useCallback((silent: boolean) => {
    if (window.google?.accounts?.oauth2) {
      requestToken(silent)
      return
    }
    const script    = document.createElement('script')
    script.src      = 'https://accounts.google.com/gsi/client'
    script.async    = true
    script.defer    = true
    script.onload   = () => requestToken(silent)
    document.head.appendChild(script)
  }, [requestToken])

  // On mount: if we have a cached user but the token expired, try a silent refresh
  useEffect(() => {
    if (!clientId) return
    const cachedUser  = loadCachedUser()
    const cachedToken = loadCachedToken()
    if (cachedUser && !cachedToken) {
      // Token expired — silently get a fresh one in the background
      loadGisAndRequest(true)
    }
  }, [clientId, loadGisAndRequest])

  // Auto-refresh token 5 min before it expires
  useEffect(() => {
    if (!providerToken) return
    const expiry = Number(localStorage.getItem(LS_TOKEN_EXPIRY) ?? 0)
    const delay  = expiry - Date.now() - 5 * 60 * 1000
    if (delay <= 0) return
    const t = setTimeout(() => loadGisAndRequest(true), delay)
    return () => clearTimeout(t)
  }, [providerToken, loadGisAndRequest])

  const signInWithGoogle = useCallback(() => {
    if (!clientId) {
      alert('Google Calendar requires VITE_GOOGLE_CLIENT_ID.\n\nSee .env.example for setup instructions.')
      return
    }
    loadGisAndRequest(false)
  }, [clientId, loadGisAndRequest])

  const signOut = useCallback(() => {
    if (providerToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(providerToken)
    }
    clearStorage()
    setUser(null)
    setProviderToken(null)
  }, [providerToken])

  return (
    <AuthContext.Provider value={{ user, providerToken, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
