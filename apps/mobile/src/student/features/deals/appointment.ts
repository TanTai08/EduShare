import type { Appointment } from '../../../../../../packages/contracts/appointment';

export type CalendarMonth = Pick<Appointment, 'year' | 'month'>;

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
