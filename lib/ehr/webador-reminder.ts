// Provider-only reminder: the info@ Webador mailbox subscription ends 2026-12-16.
// Shown from 2026-12-09 through 2026-12-16 inclusive (local calendar date); gone afterwards.
export const WEBADOR_REMINDER_START = "2026-12-09";
export const WEBADOR_REMINDER_END = "2026-12-16";
export const WEBADOR_REMINDER_TEXT =
  "Your info@ Webador email ends Dec 16. Send the bulk email telling contacts to use connect@rlth.org, then remove info@ from the website.";

function localDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function webadorReminderActive(today: Date = new Date()): boolean {
  const day = localDateString(today);
  return day >= WEBADOR_REMINDER_START && day <= WEBADOR_REMINDER_END;
}
