import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateAppointmentStatus, appointmentPreventsSession } from '../lib/ehr/appointment-status.ts';
const appointment = { id: 'test', status: 'Scheduled', date: '2026-09-01', time: '14:00' };
const options = { now: '2026-09-01T15:00:00Z', actor: 'test-provider' };
test('cancellation preserves appointment history and does not create billing', () => {
  const result = updateAppointmentStatus(appointment, 'Cancelled', options);
  assert.equal(result.date, appointment.date);
  assert.equal(result.statusHistory[0].from, 'Scheduled');
  assert.equal(result.cancelledAt, options.now);
  assert.equal(result.charge, undefined);
  assert.ok(appointmentPreventsSession(result.status));
});
test('seen requires actual time and does not accept zero or invalid duration', () => {
  assert.throws(() => updateAppointmentStatus(appointment, 'Seen', options));
  assert.throws(() => updateAppointmentStatus(appointment, 'Seen', { ...options, minutes: '-1' }));
  assert.equal(updateAppointmentStatus(appointment, 'Seen', { ...options, minutes: '45' }).sessionMinutes, 45);
});
test('reschedule requires new date/time and preserves previous slot', () => {
  assert.throws(() => updateAppointmentStatus(appointment, 'Rescheduled', options));
  const result = updateAppointmentStatus(appointment, 'Rescheduled', { ...options, date: '2026-09-03', time: '15:00' });
  assert.equal(result.date, '2026-09-03');
  assert.equal(result.statusHistory[0].previousDate, appointment.date);
});
test('optional appointment outreach drafts use the saved appointment', async () => {
  const { appointmentMessageDraft } = await import('../lib/ehr/appointment-status.ts');
  assert.match(appointmentMessageDraft({ ...appointment, status: 'Rescheduled' }), /2026-09-01 at 14:00/);
  assert.match(appointmentMessageDraft({ ...appointment, status: 'Confirmed', format: 'Telehealth' }), /secure patient portal.*not need a separate meeting link/);
  assert.doesNotMatch(appointmentMessageDraft({ ...appointment, status: 'Confirmed', format: 'In Person' }), /meeting link/);
  assert.match(appointmentMessageDraft({ ...appointment, status: 'Cancelled' }), /reschedule/);
});
