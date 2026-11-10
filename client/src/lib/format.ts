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

/** Taille lisible : « 850 Ko », « 2,4 Mo ». */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

/** Date et heure locales à partir d'une date ISO (ex. « 31 octobre 2026 à 12:00 »). */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}
