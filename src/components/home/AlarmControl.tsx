'use client';

import { useState } from 'react';
import { Shield, Loader2, AlertTriangle } from 'lucide-react';
import { useHomeAssistant } from '@/context/HomeAssistantContext';
import { useQueryClient } from '@tanstack/react-query';
import type { AlarmPanel } from '@/hooks/useFamilyData';
import { cn } from '@/lib/utils';

interface AlarmControlProps {
  panel: AlarmPanel;
}

const ACTIONS = [
  { service: 'alarm_disarm', label: 'Disarm' },
  { service: 'alarm_arm_home', label: 'Arm home' },
  { service: 'alarm_arm_away', label: 'Arm away' },
  { service: 'alarm_arm_night', label: 'Arm night' },
] as const;

/**
 * Arm/disarm controls for one HA alarm panel. When the panel requires a
 * code, a PIN field is shown; the code is sent to HA via the server-side
 * service proxy and never stored.
 */
export function AlarmControl({ panel }: AlarmControlProps) {
  const { client } = useHomeAssistant();
  const queryClient = useQueryClient();
  const [pin, setPin] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const needsCode = panel.codeFormat !== '';
  const isTriggered = panel.state === 'triggered' || panel.state === 'pending';

  const run = async (service: string) => {
    if (needsCode && !pin.trim()) {
      setError('Enter the alarm code first.');
      return;
    }
    setPending(service);
    setError(null);
    try {
      await client.callService('alarm_control_panel', service, {
        entity_id: panel.id,
        ...(needsCode ? { code: pin } : {}),
      });
      setPin('');
      await queryClient.invalidateQueries({ queryKey: ['ha-states'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The panel rejected that action.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-zinc-500" aria-hidden />
        <div className="min-w-0">
          <div className="text-sm font-medium">{panel.name}</div>
          <div className="text-xs text-zinc-500 capitalize">{panel.state.replace(/_/g, ' ')}</div>
        </div>
      </div>

      {needsCode && (
        <input
          type="password"
          inputMode={panel.codeFormat === 'number' ? 'numeric' : undefined}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Alarm code"
          aria-label={`Alarm code for ${panel.name}`}
          className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      )}

      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => {
          const isCurrent =
            (action.service === 'alarm_disarm' && panel.state === 'disarmed') ||
            (action.service !== 'alarm_disarm' &&
              panel.state === action.service.replace('alarm_', ''));
          return (
            <button
              key={action.service}
              onClick={() => run(action.service)}
              disabled={pending !== null || isCurrent || (isTriggered && action.service !== 'alarm_disarm')}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
                'hover:bg-zinc-200 dark:hover:bg-zinc-700',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              {pending === action.service ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-label="Working" />
              ) : (
                action.label
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden />
          {error}
        </div>
      )}
    </div>
  );
}
