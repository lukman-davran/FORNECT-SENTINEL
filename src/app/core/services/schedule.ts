/**
 * Model i proračun bedtime rasporeda.
 *
 * Specifikacija traži mogućnost različitog rasporeda po danu
 * u sedmici (npr. radni dani vs vikend), pa svaki dan nosi
 * svoje vrijeme. Kada je mod `sameEveryDay`, svi izabrani dani
 * koriste zajedničko vrijeme sa nivoa rasporeda.
 *
 * Logika stoji ovdje, a ne u komponentama, jer je isti
 * proračun potreban na dashboardu, u detaljima uređaja i u
 * pregledu rasporeda.
 */

export type ScheduleMode = 'sameEveryDay' | 'perDay';

export interface ScheduleDay {
  label: string;
  selected: boolean;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
}

export interface DeviceSchedule {
  enabled: boolean;
  mode: ScheduleMode;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  days: ScheduleDay[];
}

export interface DayWindow {
  start: number;
  end: number;
}

/** Redoslijed odgovara Date.getDay(). */
export const DAY_LABELS = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat'
];

export const WEEKDAY_LABELS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri'
];

export const WEEK_ORDER = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun'
];

function toMinutes(hour: string, minute: string): number {
  return Number(hour) * 60 + Number(minute);
}

/**
 * Vrijeme koje važi za dati dan, ili null ako dan nije izabran.
 */
export function windowForDay(
  schedule: DeviceSchedule,
  dayLabel: string
): DayWindow | null {
  const day = schedule.days.find(
    item => item.label === dayLabel
  );

  if (!day || !day.selected) {
    return null;
  }

  if (schedule.mode === 'perDay') {
    return {
      start: toMinutes(day.startHour, day.startMinute),
      end: toMinutes(day.endHour, day.endMinute)
    };
  }

  return {
    start: toMinutes(
      schedule.startHour,
      schedule.startMinute
    ),
    end: toMinutes(schedule.endHour, schedule.endMinute)
  };
}

/** Da li je internet pauziran rasporedom u datom trenutku. */
export function isPausedAt(
  schedule: DeviceSchedule,
  at: Date
): boolean {
  if (!schedule.enabled) {
    return false;
  }

  const minutes = at.getHours() * 60 + at.getMinutes();

  const today = windowForDay(
    schedule,
    DAY_LABELS[at.getDay()]
  );

  if (today) {
    if (
      today.start < today.end &&
      minutes >= today.start &&
      minutes < today.end
    ) {
      return true;
    }

    // Raspored koji prelazi ponoć, a počeo je danas.
    if (today.start > today.end && minutes >= today.start) {
      return true;
    }
  }

  // Raspored koji je počeo jučer i još traje.
  const previous = windowForDay(
    schedule,
    DAY_LABELS[(at.getDay() + 6) % 7]
  );

  if (
    previous &&
    previous.start > previous.end &&
    minutes < previous.end
  ) {
    return true;
  }

  return false;
}

/** Sljedeći trenutak kada raspored počinje, ili null. */
export function nextPauseStart(
  schedule: DeviceSchedule,
  from: Date
): Date | null {
  if (!schedule.enabled) {
    return null;
  }

  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(from);
    candidate.setDate(from.getDate() + offset);

    const window = windowForDay(
      schedule,
      DAY_LABELS[candidate.getDay()]
    );

    if (!window) {
      continue;
    }

    candidate.setHours(
      Math.floor(window.start / 60),
      window.start % 60,
      0,
      0
    );

    if (candidate.getTime() > from.getTime()) {
      return candidate;
    }
  }

  return null;
}

export function formatTime(
  hour: string,
  minute: string
): string {
  return `${hour}:${minute}`;
}

export function dayRangeLabel(day: ScheduleDay): string {
  return `${formatTime(day.startHour, day.startMinute)} - ${formatTime(day.endHour, day.endMinute)}`;
}

export function scheduleRangeLabel(
  schedule: DeviceSchedule
): string {
  return `${formatTime(schedule.startHour, schedule.startMinute)} - ${formatTime(schedule.endHour, schedule.endMinute)}`;
}

export function createDays(
  selectedLabels: string[],
  startHour: string,
  startMinute: string,
  endHour: string,
  endMinute: string
): ScheduleDay[] {
  return WEEK_ORDER.map(label => ({
    label,
    selected: selectedLabels.includes(label),
    startHour,
    startMinute,
    endHour,
    endMinute
  }));
}

/**
 * Dovodi zapis u trenutni oblik.
 *
 * Rasporedi snimljeni prije uvođenja vremena po danu nemaju
 * `mode` ni vrijeme na nivou dana, pa se popunjavaju sa
 * zajedničkog vremena. Time stari zapisi u localStorage-u
 * nastavljaju raditi bez gubitka podešavanja.
 */
export function normalizeSchedule(
  raw: unknown
): DeviceSchedule | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const source = raw as Partial<DeviceSchedule> & {
    days?: Partial<ScheduleDay>[];
  };

  const startHour = source.startHour ?? '21';
  const startMinute = source.startMinute ?? '00';
  const endHour = source.endHour ?? '07';
  const endMinute = source.endMinute ?? '00';

  const savedDays = Array.isArray(source.days)
    ? source.days
    : [];

  const days: ScheduleDay[] = WEEK_ORDER.map(label => {
    const saved = savedDays.find(
      day => day?.label === label
    );

    return {
      label,
      selected: saved?.selected === true,
      startHour: saved?.startHour ?? startHour,
      startMinute: saved?.startMinute ?? startMinute,
      endHour: saved?.endHour ?? endHour,
      endMinute: saved?.endMinute ?? endMinute
    };
  });

  return {
    enabled: source.enabled === true,
    mode: source.mode === 'perDay' ? 'perDay' : 'sameEveryDay',
    startHour,
    startMinute,
    endHour,
    endMinute,
    days
  };
}
