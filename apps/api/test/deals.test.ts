import assert from 'node:assert/strict';
import test from 'node:test';
import { formatAppointment, nextAppointment, pastAppointmentMessage } from '../../../packages/contracts/appointment.js';
import { dealInput } from '../src/modules/deals/validation.js';

const details = { doc: '507f1f77bcf86cd799439011', location: 'Thư viện' };

test('booking rejects earlier dates and elapsed times in Vietnam', t => {
  t.mock.method(Date, 'now', () => Date.UTC(2026, 9, 20, 3, 25, 30));
  for (const time of ['19:00 · 19/10/2026', '09:59 · 20/10/2026', '10:25 · 20/10/2026']) {
    assert.throws(() => dealInput.parse({ ...details, time }), new RegExp(pastAppointmentMessage));
  }
  assert.equal(dealInput.parse({ ...details, time: '10:26 · 20/10/2026' }).time, '10:26 · 20/10/2026');
});

test('booking rejects invalid timestamps and suggests the next minute across midnight', () => {
  for (const time of ['12:34 · 31/02/2027', '24:00 · 20/10/2027', 'ngày mai']) {
    assert.throws(() => dealInput.parse({ ...details, time }), /Ngày giờ hẹn không hợp lệ/);
  }
  const now = Date.UTC(2026, 9, 20, 16, 59, 12);
  assert.equal(formatAppointment(nextAppointment(now)), '00:00 · 21/10/2026');
});
