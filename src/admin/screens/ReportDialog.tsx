import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { studentsDict } from '../../i18n/admin/students';
import { useT } from '../../i18n/t';
import { Badge, IconButton, NormCell } from '../../ui/components';
import type { ReportFull, StudentRef } from '../api';
import { flagShort, flagStatusLabel, fmtDay, reportMeta } from '../format';
import { ErrorBox, Loading } from '../Shell';
import { useAdminApi } from '../session';

/**
 * D7: any report, in full — the student's text as sent, the parsed fields, the words it added and
 * its flags. Opened from the overview feed, the student card and the flag card; Esc or the
 * backdrop closes it.
 */
export function ReportDialog({
  id,
  student,
  onClose,
}: {
  id: string;
  /** Shown in the header when the caller knows whose report it is. */
  student?: Pick<StudentRef, 'id' | 'name'> | null;
  onClose: () => void;
}) {
  const t = useT(studentsDict);
  const api = useAdminApi();
  const q = useQuery({ queryKey: ['report', id], queryFn: () => api.reports.one(id) });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const r = q.data;
  return (
    <div className="ad-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="ad-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('reportTitle')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ad-modal-head">
          <div
            style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}
          >
            <span className="tr-eyebrow">
              {r
                ? r.type === 'READING'
                  ? t('reportReading')
                  : t('reportListening')
                : t('reportTitle')}
              {r ? ` · ${fmtDay(r.createdAt, { weekday: true })}` : ''}
              {r?.slot ? ` · ${t('slotN', { n: r.slot })}` : ''}
            </span>
            <h2 className="ad-h2" style={{ overflowWrap: 'anywhere' }}>
              {student ? (
                <Link to={`/students/${student.id}`} style={{ color: 'inherit' }}>
                  {student.name}
                </Link>
              ) : null}
              {student && r?.sourceTitle ? ' · ' : ''}
              {r?.sourceTitle ?? (student ? '' : t('reportTitle'))}
            </h2>
            {r ? <span className="ad-sub">{reportMeta(r)}</span> : null}
          </div>
          <IconButton icon="close" label={t('close')} size="sm" quiet onClick={onClose} />
        </div>

        {q.isLoading ? <Loading /> : null}
        {q.error ? <ErrorBox error={q.error} retry={() => q.refetch()} /> : null}
        {r ? (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {r.isForwarded ? <Badge tone="warn">{t('forwardedMark')}</Badge> : null}
              {r.flags.length === 0 ? (
                <Badge tone="neutral">{t('noReportFlags')}</Badge>
              ) : (
                r.flags.flatMap((f) =>
                  f.kinds.map((k) => (
                    <Badge
                      key={`${f.id}-${k}`}
                      tone={
                        f.status === 'NEW' ? 'bad' : f.status === 'REVIEWED' ? 'warn' : 'neutral'
                      }
                      title={flagStatusLabel(f.status)}
                    >
                      {flagShort(k)}
                    </Badge>
                  )),
                )
              )}
              {r.aiMetrics ? (
                <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  {t('metricsLine', {
                    words: r.aiMetrics.words,
                    errors: r.aiMetrics.errorsPer100,
                    advanced: r.aiMetrics.advanced,
                  })}
                </span>
              ) : null}
            </div>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="tr-eyebrow">{t('rawText')}</span>
              <p className="ad-box ad-modal-text">{r.rawText || r.summary || '—'}</p>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="tr-eyebrow">{t('parsedTitle')}</span>
              <Parsed r={r} />
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="tr-eyebrow">
                {t('reportWords')} · {r.words.length}
              </span>
              {r.words.length === 0 ? (
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{t('noReportWords')}</span>
              ) : (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {r.words.map((w) => (
                    <Badge key={w.id} tone={w.status === 'LEARNED' ? 'good' : 'neutral'}>
                      {w.word}
                      {w.translation ? ` — ${w.translation}` : ''}
                    </Badge>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Parsed({ r }: { r: ReportFull }) {
  const t = useT(studentsDict);
  const rows: Array<[string, string]> = [];
  if (r.sourceTitle) rows.push([t('book'), r.sourceTitle + (r.episode ? ` · ${r.episode}` : '')]);
  if (r.type === 'READING') {
    if (r.pages !== null) rows.push([t('colPages'), String(r.pages)]);
  } else {
    if (r.method) rows.push([t('method'), r.method]);
    if (r.firstPassPct !== null)
      rows.push([
        t('understood'),
        r.secondPassPct !== null
          ? `${r.firstPassPct}% → ${r.secondPassPct}%`
          : `${r.firstPassPct}%`,
      ]);
    if (r.listenCount !== null) rows.push([t('listened'), String(r.listenCount)]);
    if (r.unclearParts) rows.push([t('unclear'), r.unclearParts]);
  }
  if (r.summary && r.summary !== r.rawText) rows.push([t('retelling'), r.summary]);
  return (
    <dl className="ad-kv">
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'contents' }}>
          <dt>{k}</dt>
          <dd style={{ overflowWrap: 'anywhere' }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A compact "X/3 · Y/3" pair with icons for feed rows (D6). */
export function WeekPills({
  week,
}: {
  week: { reading: number; listening: number; readingNorm: number; listeningNorm: number };
}) {
  return (
    <>
      <NormCell value={week.reading} max={week.readingNorm} icon="book" />
      <NormCell value={week.listening} max={week.listeningNorm} icon="headphones" />
    </>
  );
}
