import type { GroupLevel } from '../api/types';
import { common } from '../i18n/common';
import { formatDict } from '../i18n/admin/format';
import { plural as pluralOf, tr } from '../i18n/t';
import { fmtDay, fmtRelative, fmtWeek, locale, plural } from '../lib/dates';
import { levelLabel } from '../lib/labels';
import type { AdminReport, FlagKind, FlagStatus, Health, StudentRef } from './api';

export { fmtDay, fmtRelative, fmtWeek, plural };

type FormatKey = Parameters<typeof tr<keyof typeof formatDict.ru>>[1];

const FLAG_TITLE_KEY: Record<FlagKind, FormatKey> = {
  PCT_JUMP: 'flagPctJump',
  NORM_MISSED_WEEK: 'flagNormMissedWeek',
  TOO_POLISHED: 'flagTooPolished',
  FORWARDED: 'flagForwarded',
  SPOT_CHECK_FAILED: 'flagSpotCheckFailed',
  REPEATED_RETELLING: 'flagRepeatedRetelling',
  STYLE_MISMATCH: 'flagStyleMismatch',
  GENERIC_RETELLING: 'flagGenericRetelling',
};

const FLAG_SHORT_KEY: Record<FlagKind, FormatKey> = {
  PCT_JUMP: 'shortPctJump',
  NORM_MISSED_WEEK: 'shortNormMissedWeek',
  TOO_POLISHED: 'shortTooPolished',
  FORWARDED: 'shortForwarded',
  SPOT_CHECK_FAILED: 'shortSpotCheckFailed',
  REPEATED_RETELLING: 'shortRepeatedRetelling',
  STYLE_MISMATCH: 'shortStyleMismatch',
  GENERIC_RETELLING: 'shortGenericRetelling',
};

const FLAG_STATUS_KEY: Record<FlagStatus, FormatKey> = {
  NEW: 'statusNew',
  REVIEWED: 'statusReviewed',
  DISMISSED: 'statusDismissed',
};

/** "Резкий скачок понимания" — the flag kind's full title in the interface language. */
export function flagTitle(kind: FlagKind): string {
  return tr(formatDict, FLAG_TITLE_KEY[kind]);
}

/** "Скачок %" — the short chip label of a flag kind. */
export function flagShort(kind: FlagKind): string {
  return tr(formatDict, FLAG_SHORT_KEY[kind]);
}

export function flagStatusLabel(status: FlagStatus): string {
  return tr(formatDict, FLAG_STATUS_KEY[status]);
}

export const HEALTH_TONE: Record<Health, 'bad' | 'cards' | 'listen'> = {
  bad: 'bad',
  warn: 'cards',
  good: 'listen',
};

export function levelOf(level: GroupLevel | null): string {
  return levelLabel(level);
}

export function groupsOf(s: Pick<StudentRef, 'groups'>): string {
  return s.groups.map((g) => g.title).join(', ') || tr(formatDict, 'noGroup');
}

export function silence(days: number, dmBlocked: boolean): string {
  if (dmBlocked) return tr(formatDict, 'blockedBot');
  if (days === 0) return tr(common, 'today');
  if (days === 1) return tr(common, 'yesterday');
  return tr(formatDict, 'silenceDays', { n: days });
}

export function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function delta(d: number): { text: string; tone: 'good' | 'bad' | undefined } {
  const pp = Math.round(d * 100);
  if (pp === 0) return { text: tr(formatDict, 'deltaSame'), tone: undefined };
  return {
    text: tr(formatDict, 'deltaPp', { sign: pp > 0 ? '+' : '−', n: Math.abs(pp) }),
    tone: pp > 0 ? 'good' : 'bad',
  };
}

/** "15 стр." / "15 pages". */
export function pages(n: number): string {
  return `${n} ${pluralOf(n, {
    ru: [tr(formatDict, 'pagesOne'), tr(formatDict, 'pagesFew'), tr(formatDict, 'pagesMany')],
    en: [tr(formatDict, 'pagesOne'), tr(formatDict, 'pagesFew')],
  })}`;
}

function times(n: number): string {
  return `${n} ${pluralOf(n, {
    ru: [tr(formatDict, 'timesOne'), tr(formatDict, 'timesFew'), tr(formatDict, 'timesMany')],
    en: [tr(formatDict, 'timesOne'), tr(formatDict, 'timesFew')],
  })}`;
}

function wordsCount(n: number): string {
  return `${n} ${pluralOf(n, {
    ru: [tr(common, 'wordOne'), tr(common, 'wordFew'), tr(common, 'wordMany')],
    en: [tr(common, 'wordOne'), tr(common, 'wordFew')],
  })}`;
}

/** "Harry Potter · 15 стр. · +3 слова" / "6 Minute English · 70% → 88% · 3 раза · +2 слова" */
export function reportMeta(r: AdminReport): string {
  const parts: string[] = [];
  if (r.sourceTitle) parts.push(r.sourceTitle + (r.episode ? ` · ${r.episode}` : ''));
  if (r.type === 'READING') {
    if (r.pages !== null) parts.push(pages(r.pages));
  } else {
    if (r.firstPassPct !== null)
      parts.push(
        r.secondPassPct !== null
          ? `${r.firstPassPct}% → ${r.secondPassPct}%`
          : `${r.firstPassPct}%`,
      );
    if (r.listenCount !== null) parts.push(times(r.listenCount));
  }
  const words = Array.isArray(r.wordsAdded) ? r.wordsAdded.length : Number(r.wordsAdded ?? 0);
  parts.push(`+${wordsCount(words)}`);
  return parts.join(' · ');
}

export function reportText(r: AdminReport): string {
  return r.rawText ?? r.summary ?? '—';
}

export function money(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

export function tokensShort(n: number): string {
  if (n >= 1_000_000) return tr(formatDict, 'millions', { n: (n / 1_000_000).toFixed(1) });
  if (n >= 1_000) return tr(formatDict, 'thousands', { n: Math.round(n / 1_000) });
  return String(n);
}

export function num(n: number): string {
  return new Intl.NumberFormat(locale()).format(n);
}

/** "HH:MM" in the interface language's locale. */
export function fmtTime(d: Date): string {
  return new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit' }).format(d);
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' })
    .format(new Date(y, m - 1, 1))
    .replace(' г.', '');
}
