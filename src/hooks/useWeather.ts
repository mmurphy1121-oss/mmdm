import { useQuery } from '@tanstack/react-query'
import { fetchWeather } from '@/lib/weatherEngine'

export function useWeather(lat: number, lon: number) {
  return useQuery({
    queryKey: ['weather', lat, lon],
    queryFn: () => fetchWeather(lat, lon),
    staleTime: 15 * 60 * 1000,   // refresh every 15 min
    enabled: !!(lat && lon),
  })
}
