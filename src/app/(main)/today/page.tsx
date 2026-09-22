'use client';

import Link from 'next/link';
import { usePeople, useHomeSummary, useWeather, useCalendarEvents, useTasks } from '@/hooks/useFamilyData';
import { StatusCard } from '@/components/today/StatusCard';
import { cn } from '@/lib/utils';
import { Loader2, Calendar, CheckCircle2, CloudSun, AlertTriangle } from 'lucide-react';

function TodaySkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin text-zinc-400" aria-label="Loading" />
    </div>
  );
}

export default function TodayPage() {
  const people = usePeople();
  const summary = useHomeSummary();
  const weather = useWeather();
  const events = useCalendarEvents();
  const tasks = useTasks();

  if (people.isLoading || summary.isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <TodaySkeleton />
      </div>
    );
  }

  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const homeCount = people.data?.filter((p) => p.state === 'home').length ?? 0;
  const awayPeople = people.data?.filter((p) => p.state !== 'home') ?? [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Today</h1>
        <p className="text-zinc-500">{dateLabel}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Who's home / who's away */}
        <StatusCard title={homeCount > 0 ? `${homeCount} home · ${awayPeople.length} away` : 'Family'} className="md:col-span-2">
          {people.data && people.data.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {people.data.map((person) => (
                <Link
                  key={person.id}
                  href="/family"
                  className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 py-2 rounded-2xl transition-colors"
                >
                  <img
                    src={person.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.id}`}
                    alt=""
                    className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700"
                  />
                  <div>
                    <div className="font-medium text-sm">{person.name}</div>
                    <div className="text-xs text-zinc-500">
                      {person.state === 'home'
                        ? 'Home'
                        : person.currentZone
                          ? `At ${person.currentZone}`
                          : 'Away'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No family members found. Add people in Home Assistant.</p>
          )}
        </StatusCard>

        {/* Weather */}
        <StatusCard title="Weather">
          {weather.isLoading ? (
            <div className="h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          ) : weather.data ? (
            <div className="flex items-center gap-4">
              <CloudSun className="w-10 h-10 text-orange-400" aria-hidden />
              <div>
                <div className="text-2xl font-bold">
                  {weather.data.temperature !== null
                    ? `${Math.round(weather.data.temperature)}${weather.data.temperatureUnit}`
                    : '--'}
                </div>
                <div className="text-sm text-zinc-500 capitalize">{weather.data.condition}</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Weather isn&apos;t configured yet.</p>
          )}
        </StatusCard>

        {/* Home status */}
        <StatusCard title="Home Status">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500">Lights on</span>
              <span className="font-medium">{summary.data?.lightsOn ?? 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500">Doors open</span>
              <span className="font-medium">
                {(summary.data?.doorsOpen ?? 0) > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400">{summary.data?.doorsOpen}</span>
                ) : (
                  0
                )}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500">Alarm</span>
              <span className="font-medium capitalize">
                {(summary.data?.alarmState ?? 'disarmed').replace('_', ' ')}
              </span>
            </div>
          </div>
        </StatusCard>

        {/* Upcoming calendar events */}
        <StatusCard title="Upcoming">
          {events.isLoading ? (
            <div className="space-y-2">
              <div className="h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              <div className="h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            </div>
          ) : events.data && events.data.length > 0 ? (
            <div className="space-y-4">
              {events.data.slice(0, 4).map((event) => (
                <div key={event.id} className="flex gap-3">
                  <Calendar className="w-5 h-5 text-blue-500 shrink-0" aria-hidden />
                  <div>
                    <div className="text-sm font-medium">{event.summary}</div>
                    <div className="text-xs text-zinc-500">
                      {new Date(event.start).toLocaleString(undefined, {
                        weekday: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Nothing on the calendar this week.</p>
          )}
        </StatusCard>

        {/* Tasks */}
        <StatusCard title="Tasks">
          {tasks.isLoading ? (
            <div className="space-y-2">
              <div className="h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              <div className="h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            </div>
          ) : tasks.data && tasks.data.length > 0 ? (
            <div className="space-y-3">
              {tasks.data.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center gap-3">
                  <CheckCircle2
                    className={cn(
                      'w-5 h-5',
                      task.completed ? 'text-green-500' : 'text-zinc-300 dark:text-zinc-600'
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      'text-sm',
                      task.completed && 'line-through text-zinc-500'
                    )}
                  >
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No tasks right now.</p>
          )}
        </StatusCard>

        {/* Connection / data problems */}
        {(people.isError || summary.isError) && (
          <div className="md:col-span-3 flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden />
            Couldn&apos;t reach Home Assistant. Some information may be out of date.
          </div>
        )}
      </div>
    </div>
  );
}
