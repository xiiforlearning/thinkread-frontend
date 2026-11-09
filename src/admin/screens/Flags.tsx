import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { flagsDict } from '../../i18n/admin/flags';
import { useT } from '../../i18n/t';
import { Badge, Button, Callout, Card, Cell, Chip } from '../../ui/components';
import type { FlagKind, FlagStatus, FlagView } from '../api';
import {
  flagShort,
  flagStatusLabel,
  flagTitle,
  fmtDay,
  groupsOf,
  HEALTH_TONE,
  reportMeta,
  reportText,
} from '../format';
import { Empty, ErrorBox, errorText, Loading, Shell } from '../Shell';
import { useAdminApi } from '../session';

type StatusFilter = 'NEW' | 'ALL';
type KindFilter = 'ALL' | FlagKind;
const KIND_CHIPS: KindFilter[] = [
  'ALL',
  'GENERIC_RETELLING',
  'REPEATED_RETELLING',
  'STYLE_MISMATCH',
  'TOO_POLISHED',
  'PCT_JUMP',
  'SPOT_CHECK_FAILED',
  'FORWARDED',
  'NORM_MISSED_WEEK',
  'NO_NEW_WORDS',
];

/** Every signal of the card: `kinds` when the API sends them, else the single `kind`. */
function kindsOf(f: Pick<FlagView, 'kind' | 'kinds'>): FlagKind[] {
  return f.kinds && f.kinds.length > 0 ? f.kinds : [f.kind];
}

/** 13 · Флаги: inbox pane + the selected flag with its report and the previous ones. */
export function FlagsScreen() {
  const t = useT(flagsDict);
  const api = useAdminApi();
  const navigate = useNavigate();
  const { id } = useParams();
  const [status, setStatus] = useState<StatusFilter>('NEW');
  const [kind, setKind] = useState<KindFilter>('ALL');
  const list = useQuery({
    queryKey: ['flags', { status, kind }],
    queryFn: () =>
      api.flags.list({
        status: status === 'NEW' ? 'NEW' : undefined,
        kind: kind === 'ALL' ? undefined : kind,
      }),
  });
  const rows = list.data ?? [];
  const firstId = rows[0]?.id;
  useEffect(() => {
    if (!id && firstId) navigate(`/flags/${firstId}`, { replace: true });
  }, [id, firstId, navigate]);

  const pane = (
    <section className="ad-pane">
      <div className="ad-pane-head">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h1 className="ad-h2">{t('title')}</h1>
          <span className="ad-sub">{t('subtitle')}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Chip selected={status === 'NEW'} onClick={() => setStatus('NEW')}>
            {t('chipNew')}
          </Chip>
          <Chip selected={status === 'ALL'} onClick={() => setStatus('ALL')}>
            {t('chipAll')}
          </Chip>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {KIND_CHIPS.map((k) => (
            <Chip key={k} selected={kind === k} onClick={() => setKind(k)}>
              {k === 'ALL' ? t('allKinds') : flagShort(k)}
            </Chip>
          ))}
        </div>
      </div>
      <div className="ad-pane-list">
        {list.isLoading ? <Loading /> : null}
        {list.error ? <ErrorBox error={list.error} retry={() => list.refetch()} /> : null}
        {list.data && rows.length === 0 ? <Empty>{t('empty')}</Empty> : null}
        {rows.map((f) => (
          <Cell
            key={f.id}
            to={`/flags/${f.id}`}
            current={f.id === id}
            avatar={f.student?.name ?? '?'}
            avatarTone={
              f.student && 'health' in f.student
                ? HEALTH_TONE[(f.student as { health: 'good' | 'warn' | 'bad' }).health]
                : 'neutral'
            }
            title={f.student?.name ?? t('student')}
            subtitle={
              f.reason
                ? f.reason.length > 70
                  ? `${f.reason.slice(0, 70)}…`
                  : f.reason
                : flagTitle(f.kind)
            }
            badge={
              kindsOf(f).length > 1
                ? `${flagShort(f.kind)} +${kindsOf(f).length - 1}`
                : flagShort(f.kind)
            }
            badgeTone="code"
            className={f.status === 'NEW' ? undefined : 'ad-dim'}
          />
        ))}
      </div>
    </section>
  );

  return <Shell pane={pane}>{id ? <FlagDetail id={id} /> : <Empty>{t('pickFlag')}</Empty>}</Shell>;
}

/** Why the card: every signal with its reason, the verified quotes and the numbers behind it. */
function Signals({ flag: f }: { flag: FlagView }) {
  const t = useT(flagsDict);
  const kinds = kindsOf(f);
  const reasons = f.reasons ?? {};
  const d = f.details ?? {};
  const m = d.metrics;
  return (
    <Card desktop title={t('why')} meta={kinds.length > 1 ? t('oneCard') : undefined}>
      {kinds.map((k) => {
        const reason = reasons[k] ?? (kinds.length === 1 ? f.reason : null);
        const claims = d.claims?.[k] ?? [];
        return (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge tone="bad">{flagShort(k)}</Badge>
              <strong style={{ fontSize: 14 }}>{flagTitle(k)}</strong>
            </div>
            <span style={{ fontSize: 13, lineHeight: '19px' }}>{reason ?? t('noReason')}</span>
            {k === 'SPOT_CHECK_FAILED' && d.spotCheck ? (
              <dl
                className="ad-kv"
                style={{ padding: '8px 12px', borderLeft: '3px solid var(--line)' }}
              >
                <dt>{t('scQuestion')}</dt>
                <dd>{d.spotCheck.question}</dd>
                <dt>{t('scAnswer')}</dt>
                <dd>{d.spotCheck.answer ?? t('scNoAnswer')}</dd>
                <dt>{t('scFragment')}</dt>
                <dd style={{ color: 'var(--ink-2)' }}>
                  {d.spotCheck.quote ? `«${d.spotCheck.quote}»` : t('scNoFragment')}
                </dd>
                <dt>{t('scVerdict')}</dt>
                <dd>{d.spotCheck.verdict}</dd>
              </dl>
            ) : null}
            {claims.map((c, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  padding: '8px 12px',
                  borderLeft: '3px solid var(--line)',
                  fontSize: 13,
                  lineHeight: '19px',
                }}
              >
                {c.statement !== reason ? <span>{c.statement}</span> : null}
                <span style={{ color: 'var(--ink-2)' }}>
                  {t('quote')}: «{c.quote}»
                </span>
                {c.previousQuote ? (
                  <span style={{ color: 'var(--ink-2)' }}>
                    {t('previousQuote')}: «{c.previousQuote}»
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        );
      })}
      {m ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            fontSize: 12,
            color: 'var(--ink-2)',
          }}
        >
          <span style={{ fontWeight: 600 }}>{t('numbers')}</span>
          <span>
            {t('metricsLine', { words: m.words, errors: m.errorsPer100, advanced: m.advanced })}
          </span>
          <span>
            {d.baseline
              ? t('baselineLine', { errors: d.baseline.errorsPer100, n: d.baseline.reports })
              : t('noBaseline')}
          </span>
          {d.errors && d.errors.length > 0 ? (
            <details>
              <summary style={{ cursor: 'pointer' }}>
                {t('errorsFound', { n: d.errors.length })}
              </summary>
              <span style={{ whiteSpace: 'pre-line' }}>
                {d.errors.map((e) => `«${e}»`).join('\n')}
              </span>
            </details>
          ) : null}
          {d.advancedQuotes && d.advancedQuotes.length > 0 ? (
            <details>
              <summary style={{ cursor: 'pointer' }}>
                {t('advancedFound', { n: d.advancedQuotes.length })}
              </summary>
              <span style={{ whiteSpace: 'pre-line' }}>
                {d.advancedQuotes.map((e) => `«${e}»`).join('\n')}
              </span>
            </details>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function FlagDetail({ id }: { id: string }) {
  const t = useT(flagsDict);
  const api = useAdminApi();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['flag', id], queryFn: () => api.flags.one(id) });
  const review = useMutation({
    mutationFn: (status: 'REVIEWED' | 'DISMISSED') => api.flags.review(id, status),
    onSuccess: (flag: FlagView) => {
      const cur = q.data;
      if (cur)
        qc.setQueryData(['flag', id], { ...cur, status: flag.status, reviewedAt: flag.reviewedAt });
      void qc.invalidateQueries({ queryKey: ['flags'] });
      void qc.invalidateQueries({ queryKey: ['nav-counts'] });
      void qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={() => q.refetch()} />;
  const f = q.data;
  if (!f) return null;
  const open = f.status === 'NEW';
  const when = fmtDay(f.createdAt, { weekday: true });
  const stateTone = (s: FlagStatus): 'bad' | 'good' | 'neutral' =>
    s === 'NEW' ? 'bad' : s === 'REVIEWED' ? 'good' : 'neutral';
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {kindsOf(f).map((k) => (
            <Badge key={k} tone="code">
              {flagShort(k)}
            </Badge>
          ))}
          <h2 className="ad-h2">{kindsOf(f).length > 1 ? t('signals') : flagTitle(f.kind)}</h2>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            fontSize: 13,
            color: 'var(--ink-2)',
            flexWrap: 'wrap',
          }}
        >
          {f.student ? (
            <Link to={`/students/${f.student.id}`} style={{ fontWeight: 600 }}>
              {f.student.name}
            </Link>
          ) : null}
          {f.student ? <span>{groupsOf(f.student)}</span> : null}
          <span>{when}</span>
          <Badge tone={stateTone(f.status)}>{flagStatusLabel(f.status)}</Badge>
        </div>
        {open ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="dark"
              size="md"
              icon="check"
              disabled={review.isPending}
              loading={review.isPending && review.variables === 'REVIEWED'}
              onClick={() => review.mutate('REVIEWED')}
            >
              {t('reviewed')}
            </Button>
            <Button
              variant="secondary"
              size="md"
              disabled={review.isPending}
              loading={review.isPending && review.variables === 'DISMISSED'}
              onClick={() => review.mutate('DISMISSED')}
            >
              {t('falseAlarm')}
            </Button>
          </div>
        ) : null}
        {review.error ? <Callout tone="bad">{errorText(review.error)}</Callout> : null}
      </div>

      <Signals flag={f} />

      <div className="ad-grid ad-grid-2">
        <Card
          desktop
          title={t('flaggedReport')}
          meta={f.report ? fmtDay(f.report.createdAt, { weekday: true }) : when}
        >
          {f.report ? (
            <>
              <p className="ad-box">{reportText(f.report)}</p>
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                {t('parsed', { meta: reportMeta(f.report) })}
                {f.report.isForwarded ? t('forwarded') : ''}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              {t('notLinked', { hint: f.student ? t('seeStudent') : '' })}
            </span>
          )}
        </Card>
        <Card desktop title={t('previousReports')} meta={t('forComparison')}>
          {f.previousReports.length === 0 ? (
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{t('noPrevious')}</span>
          ) : null}
          {f.previousReports.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: '10px 12px',
                borderRadius: 12,
                background: 'var(--surface-2)',
              }}
            >
              <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>
                {fmtDay(p.createdAt, { weekday: true })} · {reportMeta(p)}
              </span>
              <span style={{ fontSize: 13, lineHeight: '19px', whiteSpace: 'pre-line' }}>
                {reportText(p)}
              </span>
            </div>
          ))}
        </Card>
      </div>

      <Callout tone="info">{t('footer')}</Callout>
    </>
  );
}
