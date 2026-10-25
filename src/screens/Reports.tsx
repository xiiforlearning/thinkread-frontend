import { useMemo } from 'react';
import type { Report, Week } from '../api/types';
import { useProgress, useReports } from '../app/hooks';
import { ErrorBox, Loading, Screen } from '../app/Shell';
import { reportsDict } from '../i18n/screens/reports';
import { tr, useT } from '../i18n/t';
import { fmtDay, fmtWeek, words } from '../lib/dates';
import { Button, Cell, ListGroup, NormCell, SegmentedControl } from '../ui/components';

function subtitle(r: Report): string {
  const w = r.wordsAdded ? ` · +${words(r.wordsAdded)}` : '';
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
      ? t('noListeningYet')
      : thisWeek.reading.done === 0
        ? t('noReadingYet')
        : undefined
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
