'use client';

import { usePeople, usePlaces } from '@/hooks/useFamilyData';
import { FamilyMap } from '@/components/map/FamilyMap';
import { Loader2 } from 'lucide-react';

export default function MapPage() {
  const people = usePeople();
  const places = usePlaces();

  if (people.isLoading || places.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 flex flex-col" style={{ height: 'calc(100vh - 6rem)' }}>
      <header className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Map</h1>
        <p className="text-zinc-500">Family locations and places</p>
      </header>

      <div className="flex-1 relative min-h-0">
        <FamilyMap people={people.data ?? []} places={places.data ?? []} />
      </div>
    </div>
  );
}
