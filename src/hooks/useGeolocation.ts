import { useEffect, useState } from 'react'

interface Location {
  lat: number
  lon: number
  cityName: string
}

const DEFAULT: Location = { lat: 37.7749, lon: -122.4194, cityName: 'San Francisco' }

export function useGeolocation() {
  const [location, setLocation] = useState<Location>(DEFAULT)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        let cityName = 'Your Location'
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { 'Accept-Language': 'en' } },
          )
          const data = await res.json()
          cityName =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            'Your Location'
        } catch {
          // fallback to generic name
        }
        setLocation({ lat: latitude, lon: longitude, cityName })
        setLoading(false)
      },
      () => {
        // Permission denied or unavailable — use default (San Francisco)
        setLoading(false)
      },
      { timeout: 6000, maximumAge: 60_000 },
    )
  }, [])

  return { location, loading }
}
