'use client';

import { useMemo } from 'react';
import { useCalendarEvents } from '@/hooks/useFamilyData';
import type { CalendarEvent } from '@/types/family';
import { Calendar, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(key: string, today: Date): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m, d);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (key === dayKey(today)) return 'Today';
  if (key === dayKey(tomorrow)) return 'Tomorrow';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export default function CalendarPage() {
  const events = useCalendarEvents();

  const groups = useMemo(() => {
    if (!events.data) return [];
    const today = new Date();
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events.data) {
      const start = new Date(event.start);
      if (Number.isNaN(start.getTime())) continue;
      const key = dayKey(start);
      const list = map.get(key);
      if (list) list.push(event);
      else map.set(key, [event]);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, list]) => ({
        key,
        label: dayLabel(key, today),
        events: [...list].sort(
          (x, y) => new Date(x.start).getTime() - new Date(y.start).getTime()
        ),
      }));
  }, [events.data]);

  if (events.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-zinc-500">The family schedule, next 7 days</p>
      </header>

      {events.isError && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden />
          Couldn&apos;t reach Home Assistant for calendar data.
        </div>
      )}

      {groups.length === 0 ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-3">
          <Calendar className="w-10 h-10 mx-auto text-zinc-300" aria-hidden />
          <p className="font-medium">Nothing scheduled this week</p>
          <p className="text-sm text-zinc-500">
            Events from your Home Assistant calendars will show up here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key}>
              <h2
                className={cn(
                  'text-sm font-semibold uppercase tracking-wide mb-3',
                  group.label === 'Today' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'
                )}
              >
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.events.map((event) => {
                  const start = new Date(event.start);
                  const end = new Date(event.end);
                  const allDay =
                    event.start.length === 10 || event.start.indexOf('T') === -1;
                  return (
                    <div
                      key={event.id}
                      className="flex gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800"
                    >
                      <Calendar className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" aria-hidden />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{event.summary}</div>
                        <div className="text-xs text-zinc-500">
                          {allDay
                            ? 'All day'
                            : `${start.toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit',
                              })} – ${end.toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`}
                        </div>
                        {event.description && (
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
