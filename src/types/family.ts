export type PersonStatus = 'home' | 'away' | 'unknown';

export interface Person {
  id: string;
  name: string;
  avatar?: string;
  state: PersonStatus;
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;
  currentZone?: string;
  lastUpdated?: string;
  batteryLevel?: number;
  charging?: boolean;
  sourceEntity?: string;
}

export interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius?: number;
  icon?: string;
}

export interface HomeSummary {
  peopleHome: number;
  peopleAway: number;
  doorsOpen: number;
  doorsUnlocked: number;
  garageOpen: boolean;
  lightsOn: number;
  alarmState: 'disarmed' | 'armed_home' | 'armed_away' | 'triggered';
  climateSummary?: string;
}

export interface Room {
  id: string;
  name: string;
  icon?: string;
  lights: {
    id: string;
    name: string;
    state: 'on' | 'off';
  }[];
  climate?: {
    id: string;
    name: string;
    temperature: number;
    targetTemperature: number;
  };
  sensors?: {
    id: string;
    name: string;
    value: string;
  }[];
  media?: {
    id: string;
    name: string;
    state: 'playing' | 'paused' | 'idle';
  };
  covers?: {
    id: string;
    name: string;
    state: 'open' | 'closed';
  }[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  /** HA todo list entity this item belongs to (e.g. todo.household). */
  listEntityId?: string;
  /** HA item uid, required to update the item. */
  itemUid?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  description?: string;
}

export interface EnergySensorReading {
  id: string;
  name: string;
  value: number;
  unit: string;
}

export interface EnergyData {
  currentConsumption: number | null;
  currentConsumptionUnit: string;
  solarProduction: number | null;
  solarUnit?: string;
  sensors: EnergySensorReading[];
}

export interface DeviceType {
  id: string;
  name: string;
  type: 'light' | 'switch' | 'lock' | 'cover' | 'climate' | 'camera';
  state: string;
  attributes: Record<string, unknown>;
}

export interface RoomDevice {
  device: DeviceType;
  roomName: string;
}

export interface WeatherInfo {
  temperature: number | null;
  temperatureUnit: string;
  condition: string;
  humidity: number | null;
  forecast?: {
    datetime: string;
    temperature: number | null;
    condition: string;
  }[];
}
