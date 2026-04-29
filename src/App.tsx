import { AuthProvider } from '@/contexts/AuthContext'
import { SpotifyProvider } from '@/contexts/SpotifyContext'
import Index from '@/pages/Index'

export default function App() {
  return (
    <AuthProvider>
      <SpotifyProvider>
        <Index />
      </SpotifyProvider>
    </AuthProvider>
  )
}
