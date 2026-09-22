'use client';

import { useEffect, useState } from 'react';
import { Video, Loader2 } from 'lucide-react';

interface CameraGridProps {
  cameras: { id: string; name: string }[];
}

const REFRESH_MS = 15_000;

/**
 * Snapshot grid. Images stream through /api/ha/camera/[entityId], which
 * holds credentials server-side; the browser only ever sees image bytes.
 */
export function CameraGrid({ cameras }: CameraGridProps) {
  const [tick, setTick] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  if (cameras.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cameras.map((camera) => (
        <div
          key={camera.id}
          className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
          <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 relative">
            {failed.has(camera.id) ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400">
                <Video className="w-8 h-8" aria-hidden />
                <span className="text-xs">Snapshot unavailable</span>
              </div>
            ) : (
              <img
                src={`/api/ha/camera/${encodeURIComponent(camera.id)}?t=${tick}`}
                alt={`Snapshot from ${camera.name}`}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                onError={() =>
                  setFailed((prev) => {
                    const next = new Set(prev);
                    next.add(camera.id);
                    return next;
                  })
                }
              />
            )}
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium truncate">{camera.name}</span>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Live-ish</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CameraGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="aspect-video rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" aria-label="Loading cameras" />
      </div>
    </div>
  );
}
