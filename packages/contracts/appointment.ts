export type Appointment = { year: number; month: number; day: number; hour: number; minute: number };

export const minuteMs = 60_000;
const vietnamOffset = 7 * 60 * minuteMs;
export const pastAppointmentMessage = 'Vui lòng chọn ngày và giờ hẹn trong tương lai.';
export const twoDigits = (value: number) => String(value).padStart(2, '0');

export function appointmentAt(timestamp: number): Appointment {
  const date = new Date(timestamp + vietnamOffset);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate(),
    hour: date.getUTCHours(), minute: date.getUTCMinutes() };
}

export function nextAppointment(now: number): Appointment {
  return appointmentAt((Math.floor(now / minuteMs) + 1) * minuteMs);
}

export function appointmentTimestamp({ year, month, day, hour, minute }: Appointment) {
  return Date.UTC(year, month, day, hour, minute) - vietnamOffset;
}

export function formatAppointment({ year, month, day, hour, minute }: Appointment) {
  return twoDigits(hour) + ':' + twoDigits(minute) + ' · ' + twoDigits(day) + '/' + twoDigits(month + 1) + '/' + year;
}

export function parseAppointment(value: string): Appointment | undefined {
  const match = /^(\d{2}):(\d{2}) · (\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return;
  const [, hour, minute, day, month, year] = match.map(Number);
  const checked = appointmentAt(appointmentTimestamp({ year, month: month - 1, day, hour, minute }));
  if (formatAppointment(checked) === value) return checked;
}
