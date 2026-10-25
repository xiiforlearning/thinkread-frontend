import { common } from '../i18n/common';
import { currentLang } from '../i18n/lang';
import { plural as pluralOf, tr } from '../i18n/t';

/** Date helpers in the interface language. The school lives in Asia/Tashkent; "today" follows that zone like the backend. */
export const TZ = 'Asia/Tashkent';

/** Intl locale of the current interface language. */
export function locale(): string {
  return currentLang() === 'en' ? 'en-GB' : 'ru-RU';
}

const DAY = 86_400_000;

export function fmtDay(iso: string | Date, opts: { weekday?: boolean } = {}): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(locale(), {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    weekday: opts.weekday ? 'short' : undefined,
  })
    .format(d)
    .replace('.', '');
}

export function fmtLong(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(locale(), {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(d)
    .replace(' г.', '');
}

/** "Вторник, 23 сентября" */
export function fmtToday(d = new Date()): string {
  const s = new Intl.DateTimeFormat(locale(), {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Week label "22–28 сен" from a YYYY-MM-DD Monday. */
export function fmtWeek(weekStart: string): string {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(start.getTime() + 6 * DAY);
  const d = (x: Date) => new Intl.DateTimeFormat(locale(), { day: 'numeric' }).format(x);
  const m = (x: Date) =>
    new Intl.DateTimeFormat(locale(), { month: 'short' }).format(x).replace('.', '');
  return m(start) === m(end)
    ? `${d(start)}–${d(end)} ${m(end)}`
    : `${d(start)} ${m(start)} – ${d(end)} ${m(end)}`;
}

/** Days left in the current week (Monday–Sunday) in the school's zone, counting today. */
export function daysLeftInWeek(d = new Date()): number {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(d);
  const idx = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(wd);
  return 7 - (idx < 0 ? 0 : idx);
}

/** Russian plural forms; in English the `few` form serves as the plural. */
export function plural(n: number, one: string, few: string, many: string): string {
  return pluralOf(n, { ru: [one, few, many], en: [one, few] });
}

export function words(n: number): string {
  return `${n} ${pluralOf(n, { ru: [tr(common, 'wordOne'), tr(common, 'wordFew'), tr(common, 'wordMany')], en: [tr(common, 'wordOne'), tr(common, 'wordFew')] })}`;
}

export function days(n: number): string {
  return `${n} ${pluralOf(n, { ru: [tr(common, 'dayOne'), tr(common, 'dayFew'), tr(common, 'dayMany')], en: [tr(common, 'dayOne'), tr(common, 'dayFew')] })}`;
}

/** Relative "сегодня / вчера / вт, 23 сен". */
export function fmtRelative(iso: string, now = new Date()): string {
  const day = (x: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(x);
  const d = new Date(iso);
  if (day(d) === day(now)) return tr(common, 'today');
  if (day(d) === day(new Date(now.getTime() - DAY))) return tr(common, 'yesterday');
  return fmtDay(d, { weekday: true });
}
