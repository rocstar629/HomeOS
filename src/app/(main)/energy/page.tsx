'use client';

import { useEnergy } from '@/hooks/useFamilyData';
import { Zap, Sun, Loader2, AlertTriangle, Gauge } from 'lucide-react';

function formatValue(value: number, unit: string): string {
  if (unit === 'W' && value >= 1000) return `${(value / 1000).toFixed(1)} kW`;
  if (unit === 'kW') return `${value.toFixed(1)} kW`;
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${unit}`;
}

export default function EnergyPage() {
  const energy = useEnergy();

  if (energy.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" aria-label="Loading" />
      </div>
    );
  }

  const data = energy.data;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Energy</h1>
        <p className="text-zinc-500">Live household consumption and solar</p>
      </header>

      {!data ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-3">
          <Zap className="w-10 h-10 mx-auto text-zinc-300" aria-hidden />
          <p className="font-medium">No energy sensors found</p>
          <p className="text-sm text-zinc-500">
            FamilyOS looks for power and energy sensors in Home Assistant. Add them (for example
            a whole-home power sensor or a solar inverter integration) and this screen fills
            itself in.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Gauge className="w-4 h-4" aria-hidden />
                Current usage
              </div>
              <div className="mt-2 text-3xl font-bold">
                {data.currentConsumption !== null
                  ? formatValue(data.currentConsumption, data.currentConsumptionUnit)
                  : '—'}
              </div>
              {data.currentConsumption === null && (
                <div className="text-xs text-zinc-400 mt-1">No matching power sensor</div>
              )}
            </div>
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Sun className="w-4 h-4" aria-hidden />
                Solar
              </div>
              <div className="mt-2 text-3xl font-bold">
                {data.solarProduction !== null
                  ? formatValue(data.solarProduction, data.solarUnit ?? 'W')
                  : '—'}
              </div>
              {data.solarProduction === null && (
                <div className="text-xs text-zinc-400 mt-1">No solar sensor detected</div>
              )}
            </div>
          </div>

          <section>
            <h2 className="text-xl font-bold mb-4">Sensors</h2>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              {data.sensors.map((sensor) => (
                <div key={sensor.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{sensor.name}</div>
                    <div className="text-xs text-zinc-400 truncate">{sensor.id}</div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">
                    {formatValue(sensor.value, sensor.unit)}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-3">
              Values are live entity states. Historical statistics and per-day charts arrive
              with the next milestone.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
