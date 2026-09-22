import { describe, it, expect } from 'vitest';
import {
  normalizePerson,
  normalizeZone,
  normalizeHomeSummary,
  normalizeDevice,
  normalizeWeather,
  haversineMeters,
  enrichPeopleLocations,
} from './normalization';
import { HAEntity } from './types';

function entity(entity_id: string, state: string, attributes: Record<string, unknown> = {}): HAEntity {
  return { entity_id, state, last_changed: '2026-09-22T10:00:00.000Z', attributes };
}

describe('normalizePerson', () => {
  it('maps a person at home', () => {
    const person = normalizePerson(
      entity('person.dad', 'home', {
        friendly_name: 'Dad',
        latitude: 51.5074,
        longitude: -0.1278,
        battery_level: 85,
        battery_state: 'charging',
      })
    );

    expect(person.state).toBe('home');
    expect(person.currentZone).toBe('Home');
    expect(person.name).toBe('Dad');
    expect(person.latitude).toBe(51.5074);
    expect(person.batteryLevel).toBe(85);
    expect(person.charging).toBe(true);
    expect(person.sourceEntity).toBe('person.dad');
  });

  it('maps a person inside a named zone as away with that zone', () => {
    const person = normalizePerson(
      entity('person.kid', 'School', { friendly_name: 'Leo', gps_accuracy: 12 })
    );

    expect(person.state).toBe('away');
    expect(person.currentZone).toBe('School');
    expect(person.gpsAccuracy).toBe(12);
  });

  it('maps not_home as away without a zone', () => {
    const person = normalizePerson(entity('person.mom', 'not_home'));
    expect(person.state).toBe('away');
    expect(person.currentZone).toBeUndefined();
  });

  it('maps unknown and unavailable states to unknown', () => {
    expect(normalizePerson(entity('person.a', 'unknown')).state).toBe('unknown');
    expect(normalizePerson(entity('person.b', 'unavailable')).state).toBe('unknown');
  });

  it('tolerates missing attributes', () => {
    const person = normalizePerson(entity('person.x', 'home'));
    expect(person.name).toBe('person.x');
    expect(person.avatar).toBeUndefined();
    expect(person.batteryLevel).toBeUndefined();
    expect(person.latitude).toBeUndefined();
  });

  it('ignores non-numeric coordinates', () => {
    const person = normalizePerson(
      entity('person.y', 'home', { latitude: 'not-a-number', longitude: null })
    );
    expect(person.latitude).toBeUndefined();
    expect(person.longitude).toBeUndefined();
  });

  it('accepts coordinates sent as numeric strings', () => {
    const person = normalizePerson(
      entity('person.s', 'not_home', { latitude: '51.5', longitude: '-0.13' })
    );
    expect(person.latitude).toBe(51.5);
    expect(person.longitude).toBe(-0.13);
  });

  it('captures an entity-id source as trackerEntity', () => {
    const person = normalizePerson(
      entity('person.dad', 'home', { source: 'device_tracker.dads_phone' })
    );
    expect(person.trackerEntity).toBe('device_tracker.dads_phone');

    // Non-entity sources (e.g. "gps") are ignored.
    expect(normalizePerson(entity('person.x', 'home', { source: 'gps' })).trackerEntity)
      .toBeUndefined();
  });
});

describe('enrichPeopleLocations', () => {
  const dad = normalizePerson(entity('person.dad', 'not_home', { friendly_name: 'Dad' }));
  const mom = normalizePerson(
    entity('person.mom', 'home', { friendly_name: 'Mom', latitude: 1.1, longitude: 2.2 })
  );

  it('keeps people that already have coordinates untouched', () => {
    const result = enrichPeopleLocations(
      [mom],
      [entity('device_tracker.mom', 'home', { latitude: 9, longitude: 9 })]
    );
    expect(result[0].latitude).toBe(1.1);
    expect(result[0].longitude).toBe(2.2);
  });

  it('fills missing coordinates from a same-suffix device tracker', () => {
    const result = enrichPeopleLocations(
      [dad],
      [entity('device_tracker.dad', 'not_home', { latitude: 51.4, longitude: -0.2, gps_accuracy: 15 })]
    );
    expect(result[0].latitude).toBe(51.4);
    expect(result[0].longitude).toBe(-0.2);
    expect(result[0].gpsAccuracy).toBe(15);
  });

  it('fills missing coordinates via explicit source attribute', () => {
    const person = normalizePerson(
      entity('person.alex', 'not_home', { source: 'device_tracker.pixel_7' })
    );
    const result = enrichPeopleLocations(
      [person],
      [entity('device_tracker.pixel_7', 'not_home', { latitude: '40.7', longitude: '-74.0' })]
    );
    expect(result[0].latitude).toBe(40.7);
    expect(result[0].longitude).toBe(-74);
  });

  it('fills missing coordinates via matching friendly name', () => {
    const result = enrichPeopleLocations(
      [dad],
      [entity('device_tracker.dads_iphone', 'not_home', {
        friendly_name: 'Dad',
        latitude: 51.9,
        longitude: -0.1,
      })]
    );
    expect(result[0].latitude).toBe(51.9);
  });

  it('leaves people alone when no tracker matches', () => {
    const result = enrichPeopleLocations(
      [dad],
      [entity('device_tracker.stranger', 'home', { latitude: 10, longitude: 10 })]
    );
    expect(result[0].latitude).toBeUndefined();
  });

  it('ignores trackers without coordinates', () => {
    const result = enrichPeopleLocations(
      [dad],
      [entity('device_tracker.dad', 'not_home', { source: 'bluetooth' })]
    );
    expect(result[0].latitude).toBeUndefined();
  });
});

describe('normalizeZone', () => {
  it('maps zone entities to places', () => {
    const place = normalizeZone(
      entity('zone.school', '1', {
        friendly_name: 'School',
        latitude: 51.515,
        longitude: -0.13,
        radius: 50,
      })
    );

    expect(place).toEqual({
      id: 'zone.school',
      name: 'School',
      latitude: 51.515,
      longitude: -0.13,
      radius: 50,
      icon: undefined,
    });
  });

  it('returns null for non-zone entities', () => {
    expect(normalizeZone(entity('light.kitchen', 'on'))).toBeNull();
  });

  it('returns null when coordinates are missing', () => {
    expect(normalizeZone(entity('zone.broken', '1', { friendly_name: 'X' }))).toBeNull();
  });
});

describe('normalizeHomeSummary', () => {
  it('aggregates people, lights, doors and alarm', () => {
    const summary = normalizeHomeSummary([
      entity('person.a', 'home'),
      entity('person.b', 'not_home'),
      entity('person.c', 'Work'),
      entity('light.kitchen', 'on'),
      entity('light.lamp', 'off'),
      entity('binary_sensor.front_door', 'on', { device_class: 'door' }),
      entity('binary_sensor.back_door', 'off', { device_class: 'door' }),
      entity('binary_sensor.garage', 'on', { device_class: 'garage_door' }),
      entity('alarm_control_panel.home', 'armed_away'),
    ]);

    expect(summary.peopleHome).toBe(1);
    expect(summary.peopleAway).toBe(2);
    expect(summary.lightsOn).toBe(1);
    expect(summary.doorsOpen).toBe(1);
    expect(summary.garageOpen).toBe(true);
    expect(summary.alarmState).toBe('armed_away');
  });

  it('counts unlocked locks', () => {
    const summary = normalizeHomeSummary([
      entity('lock.front_door', 'locked'),
      entity('lock.back_door', 'unlocked'),
    ]);
    expect(summary.doorsUnlocked).toBe(1);
  });

  it('ignores unknown alarm states', () => {
    const summary = normalizeHomeSummary([
      entity('alarm_control_panel.home', 'disarmed'),
      entity('alarm_control_panel.cabin', 'weird_state'),
    ]);
    expect(summary.alarmState).toBe('disarmed');
  });

  it('returns a zeroed summary for an empty installation', () => {
    const summary = normalizeHomeSummary([]);
    expect(summary).toMatchObject({
      peopleHome: 0,
      peopleAway: 0,
      lightsOn: 0,
      doorsOpen: 0,
      garageOpen: false,
      alarmState: 'disarmed',
    });
  });
});

describe('normalizeDevice', () => {
  it('maps supported domains to devices', () => {
    expect(normalizeDevice(entity('light.x', 'on'))?.type).toBe('light');
    expect(normalizeDevice(entity('switch.x', 'off'))?.type).toBe('switch');
    expect(normalizeDevice(entity('lock.x', 'locked'))?.type).toBe('lock');
    expect(normalizeDevice(entity('cover.x', 'closed'))?.type).toBe('cover');
    expect(normalizeDevice(entity('climate.x', 'heat'))?.type).toBe('climate');
    expect(normalizeDevice(entity('camera.x', 'idle'))?.type).toBe('camera');
  });

  it('returns null for unrelated domains', () => {
    expect(normalizeDevice(entity('sensor.temperature', '21'))).toBeNull();
    expect(normalizeDevice(entity('person.dad', 'home'))).toBeNull();
  });

  it('uses friendly names when present', () => {
    const device = normalizeDevice(entity('light.x', 'on', { friendly_name: 'Kitchen Light' }));
    expect(device?.name).toBe('Kitchen Light');
  });
});

describe('normalizeWeather', () => {
  it('reads the first weather entity', () => {
    const weather = normalizeWeather([
      entity('weather.home', 'sunny', {
        temperature: 21.5,
        temperature_unit: '°C',
        humidity: 40,
      }),
    ]);

    expect(weather).toEqual({
      temperature: 21.5,
      temperatureUnit: '°C',
      condition: 'sunny',
      humidity: 40,
      forecast: undefined,
    });
  });

  it('returns null when no weather entity exists', () => {
    expect(normalizeWeather([entity('light.x', 'on')])).toBeNull();
  });
});

describe('haversineMeters', () => {
  it('is zero for identical points', () => {
    expect(haversineMeters(51.5, -0.12, 51.5, -0.12)).toBe(0);
  });

  it('computes a plausible distance between known cities', () => {
    // London to Paris is roughly 340 km.
    const distance = haversineMeters(51.5074, -0.1278, 48.8566, 2.3522);
    expect(distance).toBeGreaterThan(300_000);
    expect(distance).toBeLessThan(400_000);
  });
});
