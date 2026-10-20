/**
 * Temple Indian Standard Time (IST / Asia/Kolkata) Date Utilities
 * Ensures all booking dates, closures, and reports strictly follow Temple Local Time.
 */

export const TEMPLE_TIMEZONE = 'Asia/Kolkata';

export function getTempleToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TEMPLE_TIMEZONE }).format(new Date());
}

export function getTempleTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TEMPLE_TIMEZONE }).format(d);
}

export function formatTempleDateTime(isoDateString: string | Date): string {
  const date = typeof isoDateString === 'string' ? new Date(isoDateString) : isoDateString;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TEMPLE_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

