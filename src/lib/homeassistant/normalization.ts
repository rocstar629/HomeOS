import { HAEntity } from './types';
import { Person, Place, HomeSummary, DeviceType, WeatherInfo } from '@/types/family';

/**
 * Home Assistant person entities report their location as the entity state:
 * - "home" when inside the Home zone
 * - "not_home" when outside every zone
 * - the zone's friendly name (e.g. "School") when inside any other zone
 * Attributes carry GPS coordinates and battery data when the companion
 * app provides them.
 */
export function normalizePerson(entity: HAEntity): Person {
  const { entity_id, state, attributes } = entity;

  let personState: Person['state'];
  let currentZone: string | undefined;

  if (state === 'home') {
    personState = 'home';
    currentZone = 'Home';
  } else if (state === 'not_home' || state === 'unknown' || state === 'unavailable') {
    personState = state === 'unknown' || state === 'unavailable' ? 'unknown' : 'away';
  } else {
    // Inside a named zone: they are away from home, but at a known place.
    personState = 'away';
    currentZone = state;
  }

  const num = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;

  return {
    id: entity_id,
    name: (attributes.friendly_name as string) || entity_id,
    avatar: attributes.entity_picture as string | undefined,
    state: personState,
    latitude: num(attributes.latitude),
    longitude: num(attributes.longitude),
    gpsAccuracy: num(attributes.gps_accuracy),
    currentZone,
    lastUpdated: entity.last_changed,
    batteryLevel: num(attributes.battery_level),
    charging: attributes.battery_state === 'charging',
    sourceEntity: entity_id,
  };
}

/**
 * HA zone entities describe circular geofences. zone.home is the household
 * home location; the rest are schools, workplaces, etc.
 */
export function normalizeZone(entity: HAEntity): Place | null {
  if (!entity.entity_id.startsWith('zone.')) return null;
  const { attributes } = entity;
  const latitude = attributes.latitude;
  const longitude = attributes.longitude;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;

  return {
    id: entity.entity_id,
    name: (attributes.friendly_name as string) || 'Unnamed place',
    latitude,
    longitude,
    radius: typeof attributes.radius === 'number' ? attributes.radius : undefined,
    icon: attributes.icon as string | undefined,
  };
}

export function normalizeHomeSummary(entities: HAEntity[]): HomeSummary {
  const summary: HomeSummary = {
    peopleHome: 0,
    peopleAway: 0,
    doorsOpen: 0,
    doorsUnlocked: 0,
    garageOpen: false,
    lightsOn: 0,
    alarmState: 'disarmed',
    climateSummary: '',
  };

  for (const entity of entities) {
    if (entity.entity_id.startsWith('person.')) {
      if (entity.state === 'home') summary.peopleHome++;
      else if (entity.state !== 'not_home' && entity.state !== 'unknown' && entity.state !== 'unavailable') {
        summary.peopleAway++;
      } else if (entity.state === 'not_home') {
        summary.peopleAway++;
      }
    } else if (entity.entity_id.startsWith('binary_sensor.')) {
      if (entity.attributes.device_class === 'door') {
        // A door binary_sensor reports "on" while the door is open.
        if (entity.state === 'on') summary.doorsOpen++;
        else if (entity.state === 'off') summary.doorsUnlocked++;
      }
      if (entity.attributes.device_class === 'garage_door' && entity.state === 'on') {
        summary.garageOpen = true;
      }
    } else if (entity.entity_id.startsWith('light.')) {
      if (entity.state === 'on') summary.lightsOn++;
    } else if (entity.entity_id.startsWith('lock.')) {
      if (entity.state !== 'locked') summary.doorsUnlocked++;
    } else if (entity.entity_id.startsWith('alarm_control_panel.')) {
      const alarmStates = ['disarmed', 'armed_home', 'armed_away', 'triggered', 'arming', 'pending'];
      if (alarmStates.includes(entity.state)) {
        summary.alarmState = entity.state as HomeSummary['alarmState'];
      }
    }
  }

  return summary;
}

const CONTROL_DOMAINS = ['light', 'switch', 'lock', 'cover', 'climate', 'camera'] as const;
type ControlDomain = (typeof CONTROL_DOMAINS)[number];

function domainOf(entityId: string): string {
  const dot = entityId.indexOf('.');
  return dot === -1 ? '' : entityId.slice(0, dot);
}

export function normalizeDevice(entity: HAEntity): DeviceType | null {
  const domain = domainOf(entity.entity_id);
  if (!(CONTROL_DOMAINS as readonly string[]).includes(domain)) return null;

  return {
    id: entity.entity_id,
    name: (entity.attributes.friendly_name as string) || entity.entity_id,
    type: domain as ControlDomain,
    state: entity.state,
    attributes: entity.attributes,
  };
}

/**
 * Reads the first weather.* entity into a display-friendly summary.
 * Returns null when no weather integration is configured.
 */
export function normalizeWeather(entities: HAEntity[]): WeatherInfo | null {
  const weather = entities.find((e) => e.entity_id.startsWith('weather.'));
  if (!weather) return null;

  const attrs = weather.attributes;
  return {
    temperature: typeof attrs.temperature === 'number' ? attrs.temperature : null,
    temperatureUnit: typeof attrs.temperature_unit === 'string' ? attrs.temperature_unit : '°C',
    condition: weather.state,
    humidity: typeof attrs.humidity === 'number' ? attrs.humidity : null,
    forecast:
      Array.isArray(attrs.forecast) && attrs.forecast.length > 0
        ? (attrs.forecast as Array<Record<string, unknown>>).slice(0, 5).map((f) => ({
            datetime: String(f.datetime ?? ''),
            temperature: typeof f.temperature === 'number' ? f.temperature : null,
            condition: String(f.condition ?? ''),
          }))
        : undefined,
  };
}

const EARTH_RADIUS_M = 6371000;

/** Great-circle distance in meters; used for "distance from home". */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}
