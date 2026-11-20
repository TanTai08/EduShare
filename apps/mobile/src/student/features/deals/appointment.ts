export type Appointment = { year: number; month: number; day: number; hour: number; minute: number };
export type CalendarMonth = Pick<Appointment, 'year' | 'month'>;

export const twoDigits = (value: number) => String(value).padStart(2, '0');

export function defaultAppointment(now = Date.now()): Appointment {
  const hour = 60 * 60 * 1000;
  // Meetings use Vietnam time (UTC+07:00), independent of the device time zone.
  const vietnamOffset = 7 * hour;
  const nextHour = new Date((Math.floor(now / hour) + 1) * hour + vietnamOffset);
  return { year: nextHour.getUTCFullYear(), month: nextHour.getUTCMonth(), day: nextHour.getUTCDate(),
    hour: nextHour.getUTCHours(), minute: 0 };
}

export function shiftMonth({ year, month }: CalendarMonth, offset: number): CalendarMonth {
  const date = new Date(Date.UTC(year, month + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

export function monthDays({ year, month }: CalendarMonth) {
  const first = new Date(Date.UTC(year, month, 1));
  const blanks = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Array.from({ length: blanks + count }, (_, index) => index < blanks ? null : index - blanks + 1);
}

export function formatAppointment({ year, month, day, hour, minute }: Appointment) {
  return twoDigits(hour) + ':' + twoDigits(minute) + ' · ' + twoDigits(day) + '/' + twoDigits(month + 1) + '/' + year;
}
