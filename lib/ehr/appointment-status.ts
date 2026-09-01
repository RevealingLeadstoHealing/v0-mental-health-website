export const appointmentStatuses = ['Scheduled', 'Confirmed', 'Seen', 'Not seen', 'Rescheduled', 'Cancelled'] as const;
export function updateAppointmentStatus(appointment: any, status: string, options: { minutes?: string; date?: string; time?: string; now: string; actor: string }) {
  if (!appointment?.id || !appointmentStatuses.includes(status as any)) throw new Error('Select an appointment and a valid status.');
  const next: any = { ...appointment, status, statusUpdatedAt: options.now,
    statusHistory: [...(appointment.statusHistory || []), { from: appointment.status, to: status, at: options.now, by: options.actor, previousDate: appointment.date, previousTime: appointment.time }] };
  if (status === 'Seen') {
    const minutes = Number(options.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) throw new Error('Enter the actual session minutes or use the recording timer before confirming Seen.');
    next.sessionMinutes = minutes;
    next.seenAt = options.now;
  }
  if (status === 'Cancelled') next.cancelledAt = options.now;
  if (status === 'Rescheduled') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date || '') || !/^\d{2}:\d{2}$/.test(options.time || '')) throw new Error('Enter the new appointment date and time.');
    next.date = options.date; next.time = options.time;
  }
  // A status change never creates a charge or an insurance claim.
  return next;
}
export function appointmentPreventsSession(status?: string) { return ['Cancelled', 'Not seen', 'Seen'].includes(status || ''); }
export function appointmentMessageDraft(appointment: any): string {
  if (!appointment) return '';
  if (appointment.status === 'Cancelled' || appointment.status === 'Not seen') return "I'm checking in following your missed or cancelled appointment. Please let us know how you're doing and whether you would like to reschedule.";
  if (['Rescheduled', 'Confirmed', 'Scheduled'].includes(appointment.status)) return `Your appointment is scheduled for ${appointment.date} at ${appointment.time}. Please confirm whether this time works for you.`;
  return '';
}
