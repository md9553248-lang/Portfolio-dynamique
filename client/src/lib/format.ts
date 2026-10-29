const monthYear = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const fullDate = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Convertit « 2026-05 » ou « 2026-05-14 » en date UTC (évite les décalages de fuseau horaire). */
function parseIsoDate(iso: string): Date {
  const [year = '1970', month = '01', day = '01'] = iso.split('-');
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

export function formatMonthYear(iso: string): string {
  return monthYear.format(parseIsoDate(iso));
}

export function formatDate(iso: string): string {
  return fullDate.format(parseIsoDate(iso));
}

export function formatPeriod(start: string, end: string | null): string {
  return `${formatMonthYear(start)} – ${end ? formatMonthYear(end) : 'aujourd’hui'}`;
}
