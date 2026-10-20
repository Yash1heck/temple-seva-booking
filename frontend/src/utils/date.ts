/**
 * Temple Indian Standard Time (IST / Asia/Kolkata) Date Utilities
 * Ensures all UI date pickers, ticket timestamps, and schedules follow Temple Local Time.
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
  if (!isoDateString) return '—';
  const date = typeof isoDateString === 'string' ? new Date(isoDateString) : isoDateString;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TEMPLE_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export function formatTempleDate(isoDateString: string | Date): string {
  if (!isoDateString) return '—';
  const date = typeof isoDateString === 'string' ? new Date(isoDateString) : isoDateString;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TEMPLE_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

