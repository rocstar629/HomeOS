'use client';

import { useState } from 'react';
import { DeviceType } from '@/types/family';
import { useHomeAssistant } from '@/context/HomeAssistantContext';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Lightbulb, Lock, Unlock, Power, Thermometer, Video, Warehouse, Loader2 } from 'lucide-react';

interface DeviceControlProps {
  device: DeviceType;
}

const OPEN_STATES = new Set(['on', 'open', 'unlocked', 'heat', 'cool', 'auto']);

function serviceFor(device: DeviceType, turningOn: boolean): { domain: string; service: string } {
  switch (device.type) {
    case 'light':
      return { domain: 'light', service: turningOn ? 'turn_on' : 'turn_off' };
    case 'switch':
      return { domain: 'switch', service: turningOn ? 'turn_on' : 'turn_off' };
    case 'lock':
      return { domain: 'lock', service: turningOn ? 'unlock' : 'lock' };
    case 'cover':
      return { domain: 'cover', service: turningOn ? 'open_cover' : 'close_cover' };
    default:
      return { domain: 'switch', service: turningOn ? 'turn_on' : 'turn_off' };
  }
}

export function DeviceControl({ device }: DeviceControlProps) {
  const { client, isMock } = useHomeAssistant();
  const queryClient = useQueryClient();
  // Demo mode has no server to persist to, so toggles live in local state.
  const [mockState, setMockState] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  const state = isMock ? (mockState ?? device.state) : device.state;
  const isOpenish = OPEN_STATES.has(state);

  const handleToggle = async () => {
    if (isMock) {
      setMockState(isOpenish ? 'off' : 'on');
      return;
    }

    const { domain, service } = serviceFor(device, !isOpenish);
    setPending(true);
    setError(false);
    try {
      await client.callService(domain, service, { entity_id: device.id });
      await queryClient.invalidateQueries({ queryKey: ['ha-states'] });
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  };

  const getIcon = () => {
    switch (device.type) {
      case 'light':
        return (
          <Lightbulb
            className={cn('w-5 h-5', isOpenish ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-400')}
          />
        );
      case 'switch':
        return <Power className={cn('w-5 h-5', isOpenish ? 'text-blue-500' : 'text-zinc-400')} />;
      case 'lock':
        return isOpenish ? (
          <Unlock className="w-5 h-5 text-amber-500" />
        ) : (
          <Lock className="w-5 h-5 text-green-600" />
        );
      case 'cover':
        return <Warehouse className={cn('w-5 h-5', isOpenish ? 'text-amber-500' : 'text-zinc-400')} />;
      case 'climate':
        return <Thermometer className="w-5 h-5 text-orange-500" />;
      case 'camera':
        return <Video className="w-5 h-5 text-zinc-500" />;
      default:
        return <Power className="w-5 h-5" />;
    }
  };

  const stateLabel =
    device.type === 'climate'
      ? `${device.attributes.temperature ?? '--'}°`
      : state === 'unavailable'
        ? 'Unavailable'
        : state;

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border transition-colors',
        error
          ? 'border-red-300 dark:border-red-800'
          : 'border-zinc-200 dark:border-zinc-800'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {getIcon()}
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{device.name}</div>
          <div className="text-xs text-zinc-500 capitalize">{stateLabel}</div>
        </div>
      </div>

      {device.type === 'climate' || device.type === 'camera' ? (
        // Cameras and thermostats need richer controls than a toggle;
        // their full views are not built yet.
        <span className="text-xs text-zinc-400">View only</span>
      ) : (
        <button
          onClick={handleToggle}
          disabled={pending || state === 'unavailable'}
          aria-label={`${isOpenish ? 'Turn off' : 'Turn on'} ${device.name}`}
          className={cn(
            'w-12 h-6 rounded-full relative transition-colors shrink-0 disabled:opacity-50',
            isOpenish ? 'bg-yellow-500' : 'bg-zinc-300 dark:bg-zinc-700'
          )}
        >
          {pending ? (
            <Loader2 className="w-4 h-4 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
          ) : (
            <span
              className={cn(
                'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
                isOpenish && 'translate-x-6'
              )}
            />
          )}
        </button>
      )}
    </div>
  );
}
