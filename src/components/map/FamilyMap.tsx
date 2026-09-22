'use client';

import { useMemo, useState } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/maplibre';
import { Person, Place } from '@/types/family';
import { cn } from '@/lib/utils';

interface FamilyMapProps {
  people: Person[];
  places?: Place[];
}

interface PlacedPerson {
  person: Person;
  /** True when shown at a zone center because HA reported no GPS fix. */
  approximate: boolean;
}

const FALLBACK_CENTER = { longitude: -0.1278, latitude: 51.5074, zoom: 11 };

// Same-origin style (public/map-style.json): real street tiles from OSM,
// so the style itself can never fail CORS/DNS — only tiles can.
const MAP_STYLE = '/map-style.json';

function zonePlaceFor(person: Person, places: Place[]): Place | undefined {
  if (!person.currentZone) return undefined;
  const zone = person.currentZone.toLowerCase();
  return places.find((p) => p.name.toLowerCase() === zone);
}

export function FamilyMap({ people, places = [] }: FamilyMapProps) {
  const [selected, setSelected] = useState<PlacedPerson | null>(null);
  const [styleError, setStyleError] = useState(false);

  const home = useMemo(
    () => places.find((p) => p.id === 'zone.home' || p.name === 'Home'),
    [places]
  );

  // People with GPS get their fix; people known only by zone are drawn at
  // the zone center and clearly marked approximate.
  const placed = useMemo<PlacedPerson[]>(() => {
    return people
      .map((person): PlacedPerson | null => {
        if (person.latitude != null && person.longitude != null) {
          return { person, approximate: false };
        }
        const zone = zonePlaceFor(person, places);
        if (!zone) return null;
        return {
          person: { ...person, latitude: zone.latitude, longitude: zone.longitude },
          approximate: true,
        };
      })
      .filter((entry): entry is PlacedPerson => entry !== null);
  }, [people, places]);

  const initialView = useMemo(() => {
    if (home) return { longitude: home.longitude, latitude: home.latitude, zoom: 12 };
    const located = placed.find(
      (p) => p.person.latitude != null && p.person.longitude != null
    );
    if (located?.person.latitude != null && located.person.longitude != null) {
      return { longitude: located.person.longitude, latitude: located.person.latitude, zoom: 11 };
    }
    return FALLBACK_CENTER;
  }, [home, placed]);

  return (
    <div className="w-full h-full min-h-[400px] relative rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
      <Map
        initialViewState={initialView}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        onLoad={() => setStyleError(false)}
        onError={(event) => {
          // Style/tile failures surface here instead of a silent blank map.
          const message = String(event?.error?.message ?? '');
          if (message && !/tile|404|abort/i.test(message)) setStyleError(true);
        }}
      >
        {/* Known places (HA zones) */}
        {places.map((place) => (
          <Marker key={place.id} longitude={place.longitude} latitude={place.latitude}>
            <div className="flex flex-col items-center cursor-default" title={place.name}>
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
        {placed.map(({ person, approximate }) =>
          person.latitude != null && person.longitude != null ? (
            <Marker
              key={person.id}
              longitude={person.longitude}
              latitude={person.latitude}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelected({ person, approximate });
              }}
            >
              <button className="flex flex-col items-center" aria-label={`Show ${person.name}`}>
                <img
                  src={
                    person.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.id}`
                  }
                  alt=""
                  className={cn(
                    'w-10 h-10 rounded-full border-2 shadow-lg bg-zinc-200 dark:bg-zinc-700',
                    approximate
                      ? 'border-amber-400 dark:border-amber-500 opacity-80'
                      : 'border-white dark:border-zinc-900'
                  )}
                />
                <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold mt-1">
                  {person.name}
                </div>
              </button>
            </Marker>
          ) : null
        )}

        {selected?.person.latitude != null && selected.person.longitude != null && (
          <Popup
            longitude={selected.person.longitude}
            latitude={selected.person.latitude}
            onClose={() => setSelected(null)}
            closeOnClick={false}
            offset={30}
          >
            <div className="text-sm space-y-0.5 min-w-[150px]">
              <div className="font-bold">{selected.person.name}</div>
              <div className="text-zinc-600">
                {selected.person.state === 'home'
                  ? 'Home'
                  : selected.person.currentZone
                    ? `At ${selected.person.currentZone}`
                    : 'Away'}
              </div>
              {selected.approximate && (
                <div className="text-amber-700 text-xs">
                  Approximate — shown at {selected.person.currentZone} center (no GPS fix)
                </div>
              )}
              {selected.person.batteryLevel !== undefined && (
                <div className="text-zinc-500">
                  Battery {selected.person.batteryLevel}%
                  {selected.person.charging ? ' ⚡' : ''}
                </div>
              )}
              {selected.person.gpsAccuracy !== undefined && (
                <div className="text-zinc-500">
                  Accuracy ±{Math.round(selected.person.gpsAccuracy)} m
                </div>
              )}
              {selected.person.lastUpdated && (
                <div className="text-zinc-500">
                  Updated{' '}
                  {new Date(selected.person.lastUpdated).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {styleError && (
        <div className="absolute inset-x-4 top-4 mx-auto max-w-md p-3 rounded-xl bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 text-xs text-center shadow flex items-start gap-2">
          <span className="flex-1">
            Map tiles failed to load. Check the server&apos;s internet access —
            street tiles come from OpenStreetMap.
          </span>
          <button
            onClick={() => setStyleError(false)}
            aria-label="Dismiss map error"
            className="shrink-0 font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {people.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 dark:bg-zinc-900/90 px-4 py-2 rounded-full text-sm text-zinc-500">
            No family members found yet
          </div>
        </div>
      )}

      {people.length > 0 && placed.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 dark:bg-zinc-900/90 px-4 py-2 rounded-full text-sm text-zinc-500 text-center max-w-sm">
            No location data yet — people appear here once Home Assistant
            reports a zone or GPS fix.
          </div>
        </div>
      )}
    </div>
  );
}
