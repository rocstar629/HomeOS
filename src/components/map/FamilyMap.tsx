'use client';

import { useMemo } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/maplibre';
import { Person, Place } from '@/types/family';
import { useState } from 'react';

interface FamilyMapProps {
  people: Person[];
  places?: Place[];
}

const FALLBACK_CENTER = { longitude: -0.1278, latitude: 51.5074, zoom: 11 };

export function FamilyMap({ people, places = [] }: FamilyMapProps) {
  const [selected, setSelected] = useState<Person | null>(null);

  // Demo tiles: no API key required. Swap via the map provider abstraction
  // when a production tile provider is chosen.
  const mapStyle = 'https://demotiles.maplibre.org/style.json';

  const home = useMemo(() => places.find((p) => p.id === 'zone.home' || p.name === 'Home'), [places]);

  const initialView = useMemo(() => {
    if (home) return { longitude: home.longitude, latitude: home.latitude, zoom: 12 };
    const located = people.find((p) => p.latitude != null && p.longitude != null);
    if (located?.latitude != null && located.longitude != null) {
      return { longitude: located.longitude, latitude: located.latitude, zoom: 11 };
    }
    return FALLBACK_CENTER;
  }, [home, people]);

  return (
    <div className="w-full h-full min-h-[400px] relative rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
      <Map
        initialViewState={initialView}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
      >
        {/* Known places (HA zones) */}
        {places.map((place) => (
          <Marker key={place.id} longitude={place.longitude} latitude={place.latitude}>
            <div
              className="flex flex-col items-center cursor-default"
              title={place.name}
            >
              <div className="text-xl drop-shadow" aria-hidden>
                {place.name === 'Home' ? '🏠' : '📍'}
              </div>
              <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-semibold mt-0.5">
                {place.name}
              </div>
            </div>
          </Marker>
        ))}

        {/* Family members */}
        {people.map(
          (person) =>
            person.latitude != null &&
            person.longitude != null && (
              <Marker
                key={person.id}
                longitude={person.longitude}
                latitude={person.latitude}
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelected(person);
                }}
              >
                <button className="flex flex-col items-center" aria-label={`Show ${person.name}`}>
                  <img
                    src={
                      person.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.id}`
                    }
                    alt=""
                    className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-900 shadow-lg bg-zinc-200 dark:bg-zinc-700"
                  />
                  <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold mt-1">
                    {person.name}
                  </div>
                </button>
              </Marker>
            )
        )}

        {selected && selected.latitude != null && selected.longitude != null && (
          <Popup
            longitude={selected.longitude}
            latitude={selected.latitude}
            onClose={() => setSelected(null)}
            closeOnClick={false}
            offset={30}
          >
            <div className="text-sm space-y-0.5 min-w-[140px]">
              <div className="font-bold">{selected.name}</div>
              <div className="text-zinc-600">
                {selected.state === 'home'
                  ? 'Home'
                  : selected.currentZone
                    ? `At ${selected.currentZone}`
                    : 'Away'}
              </div>
              {selected.batteryLevel !== undefined && (
                <div className="text-zinc-500">
                  Battery {selected.batteryLevel}%{selected.charging ? ' ⚡' : ''}
                </div>
              )}
              {selected.gpsAccuracy !== undefined && (
                <div className="text-zinc-500">Accuracy ±{Math.round(selected.gpsAccuracy)} m</div>
              )}
              {selected.lastUpdated && (
                <div className="text-zinc-500">
                  Updated{' '}
                  {new Date(selected.lastUpdated).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {people.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 dark:bg-zinc-900/90 px-4 py-2 rounded-full text-sm text-zinc-500">
            No one has shared a location yet
          </div>
        </div>
      )}
    </div>
  );
}
