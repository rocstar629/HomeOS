'use client';

import { WifiOff, FlaskConical } from 'lucide-react';
import { useHomeAssistant } from '@/context/HomeAssistantContext';
import { cn } from '@/lib/utils';

/**
 * Unobtrusive connection indicator: a small pill shown only when the
 * Home Assistant link is degraded, or when running demo data.
 */
export function ConnectionStatus() {
  const { status, ready } = useHomeAssistant();

  if (!ready) return null;

  if (status === 'demo') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-500">
        <FlaskConical className="w-3.5 h-3.5" />
        Demo data
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div
        role="status"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
          'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
          'text-xs font-medium'
        )}
      >
        <WifiOff className="w-3.5 h-3.5" />
        Home Assistant offline — retrying
      </div>
    );
  }

  return null;
}
