import { Person, Place, HomeSummary, Room, Task, CalendarEvent, EnergyData, DeviceType } from '@/types/family';

export const MOCK_PLACES: Place[] = [
  { id: 'home', name: 'Home', latitude: 51.5074, longitude: -0.1278, radius: 100 },
  { id: 'school', name: 'School', latitude: 51.5150, longitude: -0.1300, radius: 50 },
  { id: 'work', name: 'Work', latitude: 51.5200, longitude: -0.1400, radius: 50 },
];

export const MOCK_PEOPLE: Person[] = [
  {
    id: 'person.dad',
    name: 'Dad',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dad',
    state: 'home',
    latitude: 51.5074,
    longitude: -0.1278,
    batteryLevel: 85,
    charging: true,
    sourceEntity: 'person.dad',
  },
  {
    id: 'person.mom',
    name: 'Mom',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mom',
    state: 'away',
    latitude: 51.5200,
    longitude: -0.1400,
    currentZone: 'Work',
    batteryLevel: 42,
    charging: false,
    sourceEntity: 'person.mom',
  },
  {
    id: 'person.kid1',
    name: 'Leo',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
    state: 'away',
    latitude: 51.5150,
    longitude: -0.1300,
    currentZone: 'School',
    batteryLevel: 90,
    charging: false,
    sourceEntity: 'person.kid1',
  },
];

export const MOCK_HOME_SUMMARY: HomeSummary = {
  peopleHome: 1,
  peopleAway: 2,
  doorsOpen: 0,
  doorsUnlocked: 0,
  garageOpen: false,
  lightsOn: 4,
  alarmState: 'disarmed',
  climateSummary: '71°F - All systems normal',
};

export const MOCK_ROOMS: Room[] = [
  {
    id: 'living_room',
    name: 'Living Room',
    lights: [
      { id: 'light.living_room_main', name: 'Main Light', state: 'on' },
      { id: 'light.living_room_lamp', name: 'Lamp', state: 'off' },
    ],
    climate: { id: 'climate.living_room', name: 'Living Room AC', temperature: 72, targetTemperature: 71 },
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    lights: [
      { id: 'light.kitchen_main', name: 'Kitchen Light', state: 'on' },
    ],
  },
];

export const MOCK_TASKS: Task[] = [
  { id: 'task.1', title: 'Take out the trash', completed: false },
  { id: 'task.2', title: 'Water the plants', completed: true },
];

export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  { id: 'cal.1', summary: 'Leo Soccer Practice', start: new Date().toISOString(), end: new Date(Date.now() + 3600000).toISOString() },
  { id: 'cal.2', summary: 'Dinner with Grandma', start: new Date(Date.now() + 86400000).toISOString(), end: new Date(Date.now() + 86400000 + 3600000).toISOString() },
];

export const MOCK_ENERGY: EnergyData = {
  currentConsumption: 1240,
  currentConsumptionUnit: 'W',
  solarProduction: 2100,
  solarUnit: 'W',
  sensors: [
    { id: 'sensor.energy_today', name: 'Energy today', value: 14.5, unit: 'kWh' },
    { id: 'sensor.solar_today', name: 'Solar today', value: 9.2, unit: 'kWh' },
  ],
};

export const MOCK_DEVICES: DeviceType[] = [
  {
    id: 'light.living_room_main',
    name: 'Living Room Main',
    type: 'light',
    state: 'on',
    attributes: { brightness: 255 },
  },
  {
    id: 'lock.front_door',
    name: 'Front Door',
    type: 'lock',
    state: 'locked',
    attributes: { lock: 'locked' },
  },
  {
    id: 'cover.garage_door',
    name: 'Garage Door',
    type: 'cover',
    state: 'closed',
    attributes: { current_position: 0 },
  },
  {
    id: 'switch.coffee_maker',
    name: 'Coffee Maker',
    type: 'switch',
    state: 'off',
    attributes: {},
  },
];
