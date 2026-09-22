'use client';

import { useState } from 'react';
import { usePeople } from '@/hooks/useFamilyData';
import { PersonCard } from '@/components/family/PersonCard';
import { Loader2, X } from 'lucide-react';
import { Person } from '@/types/family';

export default function FamilyPage() {
  const { data: people, isLoading, isError } = usePeople();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Family</h1>
        <p className="text-zinc-500">Household members and their current status</p>
      </header>

      {isError && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-sm">
          Couldn&apos;t reach Home Assistant. Showing the last known information.
        </div>
      )}

      {people && people.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {people.map((person) => (
            <PersonCard key={person.id} person={person} onClick={setSelectedPerson} />
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
          <p className="text-zinc-500">
            No family members found yet. People appear here once they are set up in Home Assistant.
          </p>
        </div>
      )}

      {selectedPerson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedPerson.name} details`}
          onClick={() => setSelectedPerson(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-8 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPerson(null)}
              aria-label="Close"
              className="absolute top-6 right-6 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4">
              <img
                src={
                  selectedPerson.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPerson.id}`
                }
                alt=""
                className="w-32 h-32 rounded-full bg-zinc-100 dark:bg-zinc-800"
              />
              <div>
                <h2 className="text-2xl font-bold">{selectedPerson.name}</h2>
                <p className="text-zinc-500">
                  {selectedPerson.state === 'home'
                    ? 'Home'
                    : selectedPerson.currentZone
                      ? `At ${selectedPerson.currentZone}`
                      : selectedPerson.state === 'unknown'
                        ? 'Location unknown'
                        : 'Away'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full mt-6">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                  <div className="text-xs text-zinc-500 uppercase">Place</div>
                  <div className="font-medium">{selectedPerson.currentZone || 'Unknown'}</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                  <div className="text-xs text-zinc-500 uppercase">Battery</div>
                  <div className="font-medium">
                    {selectedPerson.batteryLevel !== undefined
                      ? `${selectedPerson.batteryLevel}%${selectedPerson.charging ? ' ⚡' : ''}`
                      : '—'}
                  </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                  <div className="text-xs text-zinc-500 uppercase">GPS accuracy</div>
                  <div className="font-medium">
                    {selectedPerson.gpsAccuracy !== undefined
                      ? `±${Math.round(selectedPerson.gpsAccuracy)} m`
                      : '—'}
                  </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                  <div className="text-xs text-zinc-500 uppercase">Last update</div>
                  <div className="font-medium text-sm">
                    {selectedPerson.lastUpdated
                      ? new Date(selectedPerson.lastUpdated).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
