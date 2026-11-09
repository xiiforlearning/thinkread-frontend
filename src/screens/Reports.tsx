import { useMemo } from 'react';
import type { Report, Slot, Week } from '../api/types';
import { useProgress, useReports } from '../app/hooks';
import { ErrorBox, Loading, Screen } from '../app/Shell';
import { reportsDict } from '../i18n/screens/reports';
import { tr, useT } from '../i18n/t';
import { fmtDay, fmtWeek, words } from '../lib/dates';
import { Badge, Button, Cell, ListGroup, NormCell, SegmentedControl } from '../ui/components';

function subtitle(r: Report): string {
  const w = r.wordsAdded
    ? ` · +${words(r.wordsAdded)}`
    : r.noNewWords
      ? ` · ${tr(reportsDict, 'noNewWords')}`
      : '';
  if (r.type === 'READING')
    return `${tr(reportsDict, 'reading')}${r.pages ? ` · ${tr(reportsDict, 'pages', { n: r.pages })}` : ''}${w}`;
  const pct =
    r.firstPassPct !== null
      ? `${r.firstPassPct}%${r.secondPassPct !== null ? ` → ${r.secondPassPct}%` : ''}`
      : '';
  const cnt = r.listenCount
    ? ` · ${tr(reportsDict, r.listenCount === 1 ? 'timesOne' : 'timesOther', { n: r.listenCount })}`
    : '';
  return `${tr(reportsDict, 'listening')}${pct ? ` · ${pct}` : ''}${cnt}${w}`;
}

/** "Mon–Tue" of one window, in the UI locale, from its local days. */
function slotDays(s: Slot): string {
  const day = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' });
  return s.from === s.to ? day(s.from) : `${day(s.from)}–${day(s.to)}`;
}

const SLOT_TONE: Record<Slot['state'], 'good' | 'brand' | 'bad' | 'neutral'> = {
  done: 'good',
  open: 'brand',
  missed: 'bad',
  upcoming: 'neutral',
};

/** The three submission windows of a type (N1): filled, open now, burned or still ahead. */
function SlotRow({ label, slots }: { label: string; slots: Slot[] }) {
  const t = useT(reportsDict);
  const stateKey = {
    done: 'slotDone',
    open: 'slotOpen',
    missed: 'slotMissed',
    upcoming: 'slotUpcoming',
  } as const;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: 'var(--ink-2)', minWidth: 72 }}>{label}</span>
      {slots.map((s) => (
        <Badge key={s.slot} tone={SLOT_TONE[s.state]} title={t(stateKey[s.state])}>
          {slotDays(s)}
          {s.state === 'done' ? ' ✓' : s.state === 'missed' ? ' ✕' : ''}
        </Badge>
      ))}
    </div>
  );
}

function WeekGroup({
  week,
  reports,
  header,
  footer,
}: {
  week: Week | null;
  reports: Report[];
  header: string;
  footer?: string;
}) {
  const t = useT(reportsDict);
  const r = week?.reading.done ?? reports.filter((x) => x.type === 'READING').length;
  const l = week?.listening.done ?? reports.filter((x) => x.type === 'LISTENING').length;
  return (
    <ListGroup header={header} footer={footer}>
      <div className="tr tr-cell tr-cell-static" style={{ gap: 16 }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'var(--ink-2)',
          }}
        >
          {t('reading')} <NormCell value={r} max={week?.reading.norm ?? 3} />
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'var(--ink-2)',
          }}
        >
          {t('listening')} <NormCell value={l} max={week?.listening.norm ?? 3} />
        </span>
      </div>
      {week && week.reading.slots?.length ? (
        <div
          className="tr tr-cell tr-cell-static"
          style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}
        >
          <SlotRow label={t('reading')} slots={week.reading.slots ?? []} />
          <SlotRow label={t('listening')} slots={week.listening.slots ?? []} />
        </div>
      ) : null}
      {reports.map((rep) =>
        rep.type === 'READING' ? (
          <Cell
            key={rep.id}
            cover={rep.sourceTitle ?? t('book')}
            title={rep.sourceTitle ?? t('reading')}
            subtitle={subtitle(rep)}
            date={fmtDay(rep.createdAt, { weekday: true })}
          />
        ) : (
          <Cell
            key={rep.id}
            podcast
            title={rep.sourceTitle ?? t('listening')}
            subtitle={subtitle(rep)}
            date={fmtDay(rep.createdAt, { weekday: true })}
          />
        ),
      )}
    </ListGroup>
  );
}

/** 06 · Отчёты — history grouped by week. */
export function ReportsScreen() {
  const reports = useReports();
  const progress = useProgress();
  const t = useT(reportsDict);

  const groups = useMemo(() => {
    const map = new Map<string, Report[]>();
    for (const r of reports.data?.data ?? []) {
      const arr = map.get(r.weekStart) ?? [];
      arr.push(r);
      map.set(r.weekStart, arr);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [reports.data]);

  const thisWeek = progress.data?.week ?? null;
  const thisWeekKey = thisWeek?.weekStart;
  const hasThisWeek = groups.some(([k]) => k === thisWeekKey);
  const footer = thisWeek
    ? thisWeek.listening.done === 0
      ? `${t('noListeningYet')} ${t('windowsHint')}`
      : thisWeek.reading.done === 0
        ? `${t('noReadingYet')} ${t('windowsHint')}`
        : t('windowsHint')
    : undefined;

  return (
    <Screen
      tab="reports"
      head={
        <>
          <h1 className="tr-h1">{t('title')}</h1>
          <SegmentedControl
            value="history"
            options={[
              { value: 'history', label: t('history'), to: '/reports' },
              { value: 'method', label: t('howToListen'), to: '/reports/method' },
            ]}
            label={t('section')}
          />
        </>
      }
    >
      <Button variant="primary" size="lg" block icon="edit" to="/reports/new">
        {t('submit')}
      </Button>

      {reports.error ? <ErrorBox error={reports.error} retry={() => reports.refetch()} /> : null}
      {reports.isLoading ? <Loading /> : null}

      {thisWeek && !hasThisWeek ? (
        <WeekGroup
          week={thisWeek}
          reports={[]}
          header={`${t('thisWeek')} · ${fmtWeek(thisWeek.weekStart)}`}
          footer={footer ?? t('noReportsThisWeek')}
        />
      ) : null}
      {groups.map(([weekStart, list], i) => (
        <WeekGroup
          key={weekStart}
          week={weekStart === thisWeekKey ? thisWeek : null}
          reports={list}
          header={`${weekStart === thisWeekKey ? t('thisWeek') : i === 0 || (i === 1 && hasThisWeek) ? t('lastWeek') : t('week')} · ${fmtWeek(weekStart)}`}
          footer={weekStart === thisWeekKey ? footer : undefined}
        />
      ))}
      {reports.data && reports.data.data.length === 0 && !thisWeek ? (
        <span className="tr-muted" style={{ textAlign: 'center' }}>
          {t('empty')}
        </span>
      ) : null}
    </Screen>
  );
}
