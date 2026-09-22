'use client';

import { useDevices, useHomeSummary, useAlarmPanels, useCameras } from '@/hooks/useFamilyData';
import { DeviceControl } from '@/components/home/DeviceControl';
import { AlarmControl } from '@/components/home/AlarmControl';
import { CameraGrid } from '@/components/home/CameraGrid';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function HomePage() {
  const devices = useDevices();
  const summary = useHomeSummary();
  const alarms = useAlarmPanels();
  const cameras = useCameras();

  if (devices.isLoading || summary.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Home</h1>
        <p className="text-zinc-500">Lights, locks, switches, covers, security and cameras</p>
      </header>

      {devices.isError && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden />
          Couldn&apos;t reach Home Assistant. Devices may be out of date.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-sm text-zinc-500">Lights on</div>
          <div className="text-2xl font-bold">{summary.data?.lightsOn ?? 0}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-sm text-zinc-500">Doors open</div>
          <div className="text-2xl font-bold">{summary.data?.doorsOpen ?? 0}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-sm text-zinc-500">Alarm</div>
          <div className="text-2xl font-bold capitalize">
            {(summary.data?.alarmState ?? 'disarmed').replace('_', ' ')}
          </div>
        </div>
      </div>

      {alarms.data.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Security</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alarms.data.map((panel) => (
              <AlarmControl key={panel.id} panel={panel} />
            ))}
          </div>
        </section>
      )}

      {cameras.data.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Cameras</h2>
          <CameraGrid cameras={cameras.data} />
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold mb-4">Devices</h2>
        {devices.data && devices.data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.data.map((device) => (
              <DeviceControl key={device.id} device={device} />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
            <p className="text-zinc-500">
              No controllable devices found in Home Assistant yet.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
