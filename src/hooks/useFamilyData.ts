'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useHaStates } from '@/hooks/useHaStates';
import { useHomeAssistant } from '@/context/HomeAssistantContext';
import { MOCK_PEOPLE, MOCK_PLACES, MOCK_HOME_SUMMARY, MOCK_DEVICES, MOCK_ENERGY, MOCK_CALENDAR_EVENTS, MOCK_TASKS } from '@/lib/homeassistant/mock';
import { Person, Place, HomeSummary, DeviceType, WeatherInfo, Task, CalendarEvent, EnergyData } from '@/types/family';
import {
  normalizePerson,
  normalizeZone,
  normalizeHomeSummary,
  normalizeDevice,
  normalizeWeather,
} from '@/lib/homeassistant/normalization';

/** People (person.* entities). */
export function usePeople() {
  const { isMock, ready } = useHomeAssistant();
  const states = useHaStates();

  const data = useMemo<Person[] | undefined>(() => {
    if (isMock) return MOCK_PEOPLE;
    return states.data
      ?.filter((e) => e.entity_id.startsWith('person.'))
      .map(normalizePerson);
  }, [isMock, states.data]);

  return { data, isLoading: !ready || (!isMock && states.isLoading), isError: !isMock && states.isError };
}

/** Places (zone.* entities, including Home). */
export function usePlaces() {
  const { isMock, ready } = useHomeAssistant();
  const states = useHaStates();

  const data = useMemo<Place[] | undefined>(() => {
    if (isMock) return MOCK_PLACES;
    return states.data
      ?.filter((e) => e.entity_id.startsWith('zone.'))
      .map(normalizeZone)
      .filter((p): p is Place => p !== null);
  }, [isMock, states.data]);

  return { data, isLoading: !ready || (!isMock && states.isLoading), isError: !isMock && states.isError };
}

/** Controllable devices (lights, switches, locks, covers, climate, cameras). */
export function useDevices() {
  const { isMock, ready } = useHomeAssistant();
  const states = useHaStates();

  const data = useMemo<DeviceType[] | undefined>(() => {
    if (isMock) return MOCK_DEVICES;
    return states.data
      ?.map(normalizeDevice)
      .filter((d): d is DeviceType => d !== null);
  }, [isMock, states.data]);

  return { data, isLoading: !ready || (!isMock && states.isLoading), isError: !isMock && states.isError };
}

/** Aggregated home status for overview screens. */
export function useHomeSummary() {
  const { isMock, ready } = useHomeAssistant();
  const states = useHaStates();

  const data = useMemo<HomeSummary | undefined>(() => {
    if (isMock) return MOCK_HOME_SUMMARY;
    if (!states.data) return undefined;
    return normalizeHomeSummary(states.data);
  }, [isMock, states.data]);

  return { data, isLoading: !ready || (!isMock && states.isLoading), isError: !isMock && states.isError };
}

/** Weather from the first weather.* entity; null when not configured. */
export function useWeather() {
  const { isMock, ready } = useHomeAssistant();
  const states = useHaStates();

  const data = useMemo<WeatherInfo | null | undefined>(() => {
    if (isMock) {
      return { temperature: 71, temperatureUnit: '°F', condition: 'sunny', humidity: 45 };
    }
    if (!states.data) return undefined;
    return normalizeWeather(states.data);
  }, [isMock, states.data]);

  return { data, isLoading: !ready || (!isMock && states.isLoading) };
}

/** Upcoming calendar events (next 7 days). */
export function useCalendarEvents() {
  const { isMock, ready } = useHomeAssistant();

  const query = useQuery<CalendarEvent[]>({
    queryKey: ['ha-calendar'],
    queryFn: async () => {
      const response = await fetch('/api/ha/calendars', { cache: 'no-store' });
      if (!response.ok) return [];
      const body = await response.json();
      return Array.isArray(body.events) ? body.events : [];
    },
    enabled: ready && !isMock,
  });

  if (isMock) return { data: MOCK_CALENDAR_EVENTS, isLoading: !ready, isError: false };
  return { data: query.data, isLoading: query.isLoading, isError: query.isError };
}

/** Family to-do items. */
export function useTasks() {
  const { isMock, ready } = useHomeAssistant();

  const query = useQuery<Task[]>({
    queryKey: ['ha-todos'],
    queryFn: async () => {
      const response = await fetch('/api/ha/todos', { cache: 'no-store' });
      if (!response.ok) return [];
      const body = await response.json();
      return Array.isArray(body.tasks) ? body.tasks : [];
    },
    enabled: ready && !isMock,
  });

  if (isMock) return { data: MOCK_TASKS, isLoading: !ready, isError: false };
  return { data: query.data, isLoading: query.isLoading, isError: query.isError };
}

/** Camera entities; empty list when none are configured. */
export function useCameras() {
  const { isMock, ready } = useHomeAssistant();
  const states = useHaStates();

  const data = useMemo(() => {
    if (isMock) return [] as { id: string; name: string }[];
    return (
      states.data
        ?.filter((e) => e.entity_id.startsWith('camera.') && e.state !== 'unavailable')
        .map((e) => ({
          id: e.entity_id,
          name:
            typeof e.attributes.friendly_name === 'string'
              ? e.attributes.friendly_name
              : e.entity_id.slice('camera.'.length).replace(/_/g, ' '),
        })) ?? []
    );
  }, [isMock, states.data]);

  return { data, isLoading: !ready || (!isMock && states.isLoading), isError: !isMock && states.isError };
}

export interface AlarmPanel {
  id: string;
  name: string;
  state: string;
  /** Format required by the panel ('', 'None', 'text', 'number', …). Empty means no code. */
  codeFormat: string;
}

/** Alarm control panels; empty list when none are configured. */
export function useAlarmPanels() {
  const { isMock, ready } = useHomeAssistant();
  const states = useHaStates();

  const data = useMemo<AlarmPanel[]>(() => {
    if (isMock) return [];
    return (
      states.data
        ?.filter((e) => e.entity_id.startsWith('alarm_control_panel.'))
        .map((e) => {
          const rawFormat = e.attributes.code_format;
          const codeFormat = typeof rawFormat === 'string' ? rawFormat : 'None';
          const needsCode = codeFormat !== '' && codeFormat !== 'None';
          return {
            id: e.entity_id,
            name:
              typeof e.attributes.friendly_name === 'string'
                ? e.attributes.friendly_name
                : 'Alarm',
            state: e.state,
            codeFormat: needsCode ? codeFormat : '',
          };
        }) ?? []
    );
  }, [isMock, states.data]);

  return { data, isLoading: !ready || (!isMock && states.isLoading), isError: !isMock && states.isError };
}

interface SensorReading {
  id: string;
  name: string;
  value: number;
  unit: string;
}

const SOLAR_RE = /solar|pv|generat|production/i;
const CONSUMPTION_RE = /power|consumption|load|usage|demand|watt|house|home/i;

/** Energy/power sensors read live from entity states; null when none exist. */
export function useEnergy() {
  const { isMock, ready } = useHomeAssistant();
  const states = useHaStates();

  const data = useMemo<EnergyData | null | undefined>(() => {
    if (isMock) return MOCK_ENERGY;
    if (!states.data) return undefined;

    const readings: SensorReading[] = [];
    for (const entity of states.data) {
      if (!entity.entity_id.startsWith('sensor.')) continue;
      const { device_class: deviceClass, unit_of_measurement: unit } = entity.attributes;
      if (typeof unit !== 'string' || !unit) continue;
      const value = Number(entity.state);
      if (!Number.isFinite(value)) continue;
      const name =
        typeof entity.attributes.friendly_name === 'string'
          ? entity.attributes.friendly_name
          : entity.entity_id.slice('sensor.'.length).replace(/_/g, ' ');

      if (deviceClass === 'power') {
        readings.push({ id: entity.entity_id, name, value, unit });
      } else if (deviceClass === 'energy') {
        readings.push({ id: entity.entity_id, name, value, unit });
      }
    }

    if (readings.length === 0) return null;

    const powerReadings = readings.filter((r) => r.unit === 'W' || r.unit === 'kW');
    const solarPower =
      powerReadings.find((r) => SOLAR_RE.test(r.name)) ?? null;
    const consumptionPower =
      powerReadings.find((r) => !SOLAR_RE.test(r.name) && CONSUMPTION_RE.test(r.name)) ??
      powerReadings.find((r) => !SOLAR_RE.test(r.name)) ??
      null;

    return {
      currentConsumption: consumptionPower?.value ?? null,
      currentConsumptionUnit: consumptionPower?.unit ?? 'W',
      solarProduction: solarPower?.value ?? null,
      solarUnit: solarPower?.unit,
      sensors: readings,
    };
  }, [isMock, states.data]);

  if (isMock) return { data: MOCK_ENERGY, isLoading: !ready };
  return { data, isLoading: !ready || states.isLoading };
}
