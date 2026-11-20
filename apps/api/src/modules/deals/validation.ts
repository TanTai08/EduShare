import { z } from 'zod';
import { appointmentTimestamp, parseAppointment, pastAppointmentMessage } from '../../../../../packages/contracts/appointment.js';
import { objectId, text } from '../../validation.js';

export const dealInput = z.object({
  doc: objectId,
  location: text(160),
  time: text(80).superRefine((value, ctx) => {
    const appointment = parseAppointment(value);
    if (!appointment) {
      ctx.addIssue({ code: 'custom', message: 'Ngày giờ hẹn không hợp lệ. Vui lòng chọn lại trong bộ lịch.' });
    } else if (appointmentTimestamp(appointment) <= Date.now()) {
      ctx.addIssue({ code: 'custom', message: pastAppointmentMessage });
    }
  }),
});
