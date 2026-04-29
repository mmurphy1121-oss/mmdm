import HeroHeader from '@/components/HeroHeader';
import HourlyForecast from '@/components/HourlyForecast';
import DayTimeline from '@/components/DayTimeline';
import DaySelector from '@/components/DaySelector';
import GearChecklist from '@/components/GearChecklist';
import SmartInsight from '@/components/SmartInsight';
import OutfitCard from '@/components/OutfitCard';
import ScheduleOptimizer from '@/components/ScheduleOptimizer';
import SpotifyCard from '@/components/SpotifyCard';
import OuraCard from '@/components/OuraCard';
import ChatBot from '@/components/ChatBot';
import { useSpotify } from '@/contexts/SpotifyContext';
import { LogOut } from 'lucide-react';
import { useWeather } from '@/hooks/useWeather';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCalendar } from '@/hooks/useCalendar';
import { useExternalCalendar } from '@/hooks/useExternalCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { generateGearChecklist, generateInsights, generateCalendarEvents, mapRealCalendarEvents, generateOutfit, generateScheduleOptimizations, generateOuraInsights, generateOuraNudges } from '@/lib/weatherEngine';
import { useOura } from '@/hooks/useOura';
import { useWeekCalendar } from '@/hooks/useWeekCalendar';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { WeatherHour } from '@/data/mockData';

const Index = () => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');

  const { location, loading: geoLoading } = useGeolocation();
  const { data: weather, isLoading: weatherLoading, error } = useWeather(location.lat, location.lon);
  const { user, providerToken, signInWithGoogle, signOut } = useAuth();
  const { spotifyToken } = useSpotify();
  const { data: googleCalendarEvents, isLoading: googleCalLoading, error: calendarError } = useCalendar(providerToken, selectedDate);
  const { data: externalCalendarEvents, isLoading: externalCalLoading, error: icalError } = useExternalCalendar(selectedDate);
  const { data: weekEvents, isLoading: weekCalLoading } = useWeekCalendar(providerToken);
  const { data: ouraData } = useOura();

  const isLoading = geoLoading || weatherLoading;

  // Build daily condition map for DaySelector
  const dailyConditions = useMemo(() => {
    if (!weather?.daily) return undefined;
    return Object.fromEntries(weather.daily.map(d => [d.date, d.condition]));
  }, [weather]);

  // Get hourly data for the selected day
  const hourly = useMemo<WeatherHour[]>(() => {
    if (!weather) return [];
    if (weather.hourlyByDate && weather.hourlyByDate[selectedDateKey]) {
      return weather.hourlyByDate[selectedDateKey] as WeatherHour[];
    }
    if (isToday && weather.hourly) {
      return weather.hourly as WeatherHour[];
    }
    return [];
  }, [weather, selectedDateKey, isToday]);

  // Get daily summary for selected date (for non-today hero)
  const dailySummary = useMemo(() => {
    if (!weather?.daily) return null;
    return weather.daily.find(d => d.date === selectedDateKey) || null;
  }, [weather, selectedDateKey]);

  const uvRange = useMemo(() => {
    if (hourly.length === 0) return undefined;
    const uvs = hourly.map(h => h.uv);
    return { min: Math.min(...uvs), max: Math.max(...uvs) };
  }, [hourly]);

  const scheduleOptimizations = useMemo(() => {
    if (!weekEvents || !weather?.hourlyByDate) return [];
    return generateScheduleOptimizations(weekEvents, weather.hourlyByDate);
  }, [weekEvents, weather]);

  const outfit = useMemo(() => {
    if (hourly.length === 0) return null;
    return generateOutfit(hourly);
  }, [hourly]);

  const gear = useMemo(() => {
    if (hourly.length === 0) return [];
    return generateGearChecklist(hourly);
  }, [hourly]);

  // Merge external DB events with Google Calendar events; external DB takes priority
  const calendarEvents = useMemo(() => {
    if (externalCalendarEvents && externalCalendarEvents.length > 0) return externalCalendarEvents;
    if (googleCalendarEvents && googleCalendarEvents.length > 0) return googleCalendarEvents;
    return null;
  }, [externalCalendarEvents, googleCalendarEvents, isToday]);

  const calendarLoading = googleCalLoading || externalCalLoading;

  const events = useMemo(() => {
    if (hourly.length === 0) return [];
    if (calendarEvents && calendarEvents.length > 0) {
      return mapRealCalendarEvents(calendarEvents, hourly);
    }
    if (isToday) return generateCalendarEvents(hourly);
    return [];
  }, [hourly, calendarEvents, isToday]);

  const hasRealCalendar = !!(calendarEvents && calendarEvents.length > 0);

  const insights = useMemo(() => {
    if (hourly.length === 0) return [];
    const weatherInsights = generateInsights(hourly, events);
    const ouraInsights = generateOuraInsights(ouraData?.readiness ?? null, ouraData?.sleep ?? null, hourly);
    return [...ouraInsights, ...weatherInsights].slice(0, 10);
  }, [hourly, events, ouraData]);

  const ouraNudges = useMemo(() => {
    if (hourly.length === 0) return [];
    return generateOuraNudges(ouraData?.readiness ?? null, ouraData?.sleep ?? null, hourly, events);
  }, [hourly, events, ouraData]);

  // Build current-like object for non-today days
  const currentForHero = useMemo(() => {
    if (isToday) return weather?.current;
    if (!dailySummary || hourly.length === 0) return undefined;
    const midday = hourly.find(h => h.time === '12 PM') || hourly[Math.floor(hourly.length / 2)];
    return {
      temp: midday.temp,
      feelsLike: midday.feelsLike,
      humidity: midday.humidity,
      wind: midday.wind,
      uv: midday.uv,
      condition: dailySummary.condition,
      description: dailySummary.description,
      high: dailySummary.high,
      low: dailySummary.low,
    };
  }, [isToday, weather, dailySummary, hourly]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌤️</span>
            <div>
              <span className="font-bold text-foreground text-lg tracking-tight">MMDM</span>
              <span className="hidden sm:inline text-xs text-muted-foreground ml-2">Meteorologist Mad Dog Murph</span>
            </div>
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="text-sm text-primary font-medium hover:underline flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Connect Calendar
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-xl px-4 py-3 text-sm">
            Unable to load live weather. Showing may be incomplete.
          </div>
        )}

        {calendarError && (
          <div className="bg-secondary/20 text-secondary-foreground rounded-xl px-4 py-3 text-sm">
            Calendar access requires permission. Try signing in again.
          </div>
        )}

        {icalError && (
          <div className="bg-destructive/10 text-destructive rounded-xl px-4 py-3 text-sm">
            Apple Calendar failed to load: {(icalError as Error).message}
          </div>
        )}

        <DaySelector
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          dailyConditions={dailyConditions}
        />

        <HeroHeader current={currentForHero} loading={isLoading} cityName={location.cityName} date={selectedDate} uvRange={uvRange} />
        <HourlyForecast hourly={hourly} loading={isLoading} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <OutfitCard outfit={outfit} loading={isLoading} />
          <GearChecklist items={gear} loading={isLoading} />
        </div>

        <SmartInsight insights={insights} loading={isLoading} />

        <OuraCard />

        <SpotifyCard hourly={hourly} events={events} loading={isLoading} />

        <ScheduleOptimizer
          optimizations={scheduleOptimizations}
          nudges={ouraNudges}
          loading={isLoading || weekCalLoading}
          hasCalendar={!!(providerToken || weekEvents)}
        />

        <DayTimeline
          events={events}
          loading={isLoading || calendarLoading}
          subtitle={hasRealCalendar ? 'From your calendar' : isToday ? 'Sample events — connect your calendar for real data' : 'No events scheduled'}
        />
      </main>

      <footer className="max-w-2xl mx-auto px-4 py-8 text-center text-xs text-muted-foreground">
        MMDM · Meteorologist Mad Dog Murph
      </footer>

      <ChatBot hourly={hourly} events={events} />
    </div>
  );
};

export default Index;
