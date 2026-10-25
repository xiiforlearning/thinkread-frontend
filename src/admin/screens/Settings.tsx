import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useState } from 'react';
import { settingsDict } from '../../i18n/admin/settings';
import { plural, tr, useT } from '../../i18n/t';
import {
  Badge,
  Button,
  Callout,
  Card,
  Cell,
  HealthDot,
  ListGroup,
  TextField,
} from '../../ui/components';
import { money, monthLabel, num, tokensShort } from '../format';
import { ErrorBox, errorText, Loading, PageHead, Shell } from '../Shell';
import { useAdminApi } from '../session';

const PURPOSE_KEY: Record<string, keyof typeof settingsDict.ru> = {
  DIALOG: 'purposeDialog',
  ENRICH_WORDS: 'purposeEnrich',
  AUTHENTICITY: 'purposeAuthenticity',
  SENTENCE_CHECK: 'purposeSentenceCheck',
  PARENT_REPORT: 'purposeParentReport',
  TEACHER_CHAT: 'purposeTeacherChat',
  SCHOOL_CHAT: 'purposeSchoolChat',
};
function purposeLabel(purpose: string): string {
  const key = PURPOSE_KEY[purpose];
  return key ? tr(settingsDict, key) : purpose;
}

/** 15 · Настройки (owner): norms, reminders, health thresholds, staff, AI spend. */
export function SettingsScreen() {
  const t = useT(settingsDict);
  const api = useAdminApi();
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.settings.get() });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (settings.data) {
      setDraft(Object.fromEntries(settings.data.settings.map((s) => [s.key, String(s.value)])));
      setSaved(false);
    }
  }, [settings.data]);
  const save = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.settings.update(values),
    onSuccess: (res) => {
      qc.setQueryData(['settings'], { keys: settings.data?.keys ?? [], settings: res.settings });
      setSaved(true);
    },
  });
  const reset = useMutation({
    mutationFn: (key: string) => api.settings.reset(key),
    onSuccess: (res) =>
      qc.setQueryData(['settings'], { keys: settings.data?.keys ?? [], settings: res.settings }),
  });

  const byKey = new Map((settings.data?.settings ?? []).map((s) => [s.key, s]));
  const changed = (): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(draft)) {
      const s = byKey.get(key);
      if (!s || raw === String(s.value)) continue;
      out[key] = typeof s.default === 'number' ? Number(raw.replace(',', '.')) : raw.trim();
    }
    return out;
  };
  const dirty = Object.keys(changed()).length > 0;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (dirty) save.mutate(changed());
  };
  const field = (
    key: string,
    label: string,
    extra?: { type?: 'time' | 'number'; step?: string },
  ) => {
    const s = byKey.get(key);
    return (
      <TextField
        label={
          <>
            {label}
            {s?.overridden ? (
              <>
                {' '}
                <button
                  type="button"
                  className="ad-link"
                  onClick={() => reset.mutate(key)}
                  title={t('resetTo', { value: String(s.default) })}
                >
                  {t('reset')}
                </button>
              </>
            ) : null}
          </>
        }
        value={draft[key] ?? ''}
        onChange={(e) => {
          setDraft((d) => ({ ...d, [key]: e.target.value }));
          setSaved(false);
        }}
        type={extra?.type ?? 'number'}
        step={extra?.step ?? (extra?.type === 'time' ? undefined : '1')}
        inputMode={extra?.type === 'time' ? undefined : 'decimal'}
        disabled={!s}
      />
    );
  };

  return (
    <Shell>
      <form onSubmit={submit} style={{ display: 'contents' }}>
        <PageHead
          title={t('title')}
          subtitle={t('subtitle')}
          aside={
            <Button
              variant={saved ? 'good' : 'dark'}
              size="md"
              icon="check"
              type="submit"
              disabled={!dirty || save.isPending}
            >
              {save.isPending ? t('saving') : saved ? t('saved') : t('saveChanges')}
            </Button>
          }
        />
        {settings.isLoading ? <Loading /> : null}
        {settings.error ? (
          <ErrorBox error={settings.error} retry={() => settings.refetch()} />
        ) : null}
        {save.error ? <Callout tone="bad">{errorText(save.error)}</Callout> : null}
        {reset.error ? <Callout tone="bad">{errorText(reset.error)}</Callout> : null}

        <div className="ad-grid ad-grid-2">
          <Card desktop title={t('norms')} meta={t('normsMeta')}>
            <div
              className="ad-form"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 12,
                alignItems: 'end',
              }}
            >
              {field('norms.readingPerWeek', t('readingPerWeek'))}
              {field('norms.listeningPerWeek', t('listeningPerWeek'))}
              {field('norms.cardsPerDay', t('cardsPerDay'))}
            </div>
            <div
              className="ad-form"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 12,
                alignItems: 'end',
              }}
            >
              {field('cards.correctToAdvance', t('correctToAdvance'))}
              {field('cards.stage3ToLearned', t('stage3ToLearned'))}
            </div>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{t('normsNote')}</span>
          </Card>

          <Card desktop title={t('remindersAi')}>
            <div
              className="ad-form"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 12,
                alignItems: 'end',
              }}
            >
              {field('reminders.cardsTime', t('cardsTime'), { type: 'time' })}
              {field('reminders.reportsTime', t('reportsTime'), { type: 'time' })}
              {field('reminders.tiredDays', t('tiredDays'))}
              {field('ai.spotCheckProbability', t('spotCheckProbability'), { step: '0.05' })}
              {field('ai.dailyTokenLimitPerStudent', t('dailyTokenLimit'), { step: '1000' })}
            </div>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{t('remindersNote')}</span>
          </Card>
        </div>

        <div className="ad-grid ad-grid-2">
          <Card desktop title={t('healthThresholds')} meta={t('healthMeta')}>
            <div
              className="ad-form"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 12,
                alignItems: 'end',
              }}
            >
              <div className="tr-field">
                <HealthDot status="good">{t('healthGood')}</HealthDot>
                <span
                  className="tr-input"
                  style={{ display: 'flex', alignItems: 'center', color: 'var(--ink-2)' }}
                >
                  {Math.max(0, Number(draft['health.yellowInactiveDays'] ?? 0) - 1)}
                </span>
              </div>
              <div className="tr-field">
                <HealthDot status="warn">{t('healthWarn')}</HealthDot>
                {field('health.yellowInactiveDays', '')}
              </div>
              <div className="tr-field">
                <HealthDot status="bad">{t('healthBad')}</HealthDot>
                {field('health.redInactiveDays', '')}
              </div>
            </div>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{t('healthNote')}</span>
            <StaffCard />
          </Card>
          <UsageCard />
        </div>
      </form>
      <OpsCard />
    </Shell>
  );
}

/** Scheduled jobs on demand — for checking the texts and for the demo in Telegram. */
function OpsCard() {
  const t = useT(settingsDict);
  const api = useAdminApi();
  const [log, setLog] = useState<string[]>([]);
  const note = (line: string) => setLog((l) => [line, ...l].slice(0, 6));
  const reminders = useMutation({
    mutationFn: (kind: 'CARDS' | 'REPORTS') => api.ops.runReminders(kind),
    onSuccess: (r) =>
      note(
        t('remindersLog', {
          kind: r.kind === 'CARDS' ? t('kindCards') : t('kindReports'),
          day: r.day,
          sent: r.sent,
          candidates: r.candidates,
          done: r.skipped.done,
          reminded: r.skipped.reminded,
          calm: r.skipped.calm,
          failed: r.skipped.failed,
        }),
      ),
    onError: (e) => note(errorText(e)),
  });
  const summary = useMutation({
    mutationFn: () => api.ops.runWeeklySummary(),
    onSuccess: (r) =>
      note(
        t('summaryLog', {
          week: r.summary.weekLabel,
          recipients: `${r.sentTo.length} ${plural(r.sentTo.length, {
            ru: [t('recipientOne'), t('recipientFew'), t('recipientMany')],
            en: [t('recipientOne'), t('recipientFew')],
          })}`,
          flagged: r.flagged,
        }),
      ),
    onError: (e) => note(errorText(e)),
  });
  const preview = useQuery({
    queryKey: ['weekly-summary'],
    queryFn: () => api.ops.weeklySummary('last'),
    enabled: false,
  });
  const busy = reminders.isPending || summary.isPending || preview.isFetching;
  return (
    <Card desktop title={t('mailings')} meta={t('mailingsMeta')}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button
          variant="secondary"
          size="sm"
          icon="bell"
          disabled={busy}
          onClick={() => reminders.mutate('CARDS')}
        >
          {t('remindCards')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon="bell"
          disabled={busy}
          onClick={() => reminders.mutate('REPORTS')}
        >
          {t('remindReports')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon="list"
          disabled={busy}
          onClick={() => preview.refetch()}
        >
          {t('showSummary')}
        </Button>
        <Button
          variant="dark"
          size="sm"
          icon="send"
          disabled={busy}
          onClick={() => summary.mutate()}
        >
          {t('sendSummary')}
        </Button>
      </div>
      {preview.data ? <p className="ad-box">{preview.data.text}</p> : null}
      {log.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            fontSize: 12,
            color: 'var(--ink-2)',
          }}
        >
          {log.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      ) : null}
      <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{t('mailingsNote')}</span>
    </Card>
  );
}

function StaffCard() {
  const t = useT(settingsDict);
  const api = useAdminApi();
  const qc = useQueryClient();
  const staff = useQuery({ queryKey: ['staff'], queryFn: () => api.staff.list() });
  const [adding, setAdding] = useState(false);
  const [tgId, setTgId] = useState('');
  const [name, setName] = useState('');
  const grant = useMutation({
    mutationFn: () =>
      api.staff.grant({ telegramUserId: Number(tgId), role: 'TEACHER', name: name.trim() || null }),
    onSuccess: (list) => {
      qc.setQueryData(['staff'], list);
      setAdding(false);
      setTgId('');
      setName('');
    },
  });
  const revoke = useMutation({
    mutationFn: (id: number) => api.staff.revoke(id),
    onSuccess: (list) => qc.setQueryData(['staff'], list),
  });
  return (
    <ListGroup desktop header={t('teachers')}>
      {staff.isLoading ? <Loading /> : null}
      {(staff.data ?? []).map((s) => (
        <Cell
          key={s.telegramUserId}
          avatar={s.name ?? `id ${s.telegramUserId}`}
          avatarTone={s.role === 'OWNER' ? 'solid' : 'listen'}
          title={s.name ?? `Telegram id ${s.telegramUserId}`}
          subtitle={
            s.groups.map((g) => g.title).join(', ') ||
            (s.role === 'OWNER' ? t('allGroups') : t('noGroupsFound'))
          }
          badge={s.role}
          badgeTone={s.role === 'OWNER' ? 'count' : 'brand'}
          trailing={
            s.role === 'TEACHER' && s.granted ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(s.telegramUserId)}
              >
                {t('revoke')}
              </Button>
            ) : undefined
          }
        />
      ))}
      {adding ? (
        <div
          className="tr-cell tr-cell-static ad-form"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            gap: 8,
            alignItems: 'end',
          }}
        >
          <TextField
            label={t('telegramId')}
            value={tgId}
            onChange={(e) => setTgId(e.target.value)}
            inputMode="numeric"
            placeholder="123456789"
          />
          <TextField
            label={t('name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
          />
          <Button
            variant="primary"
            size="md"
            disabled={!/^\d+$/.test(tgId) || grant.isPending}
            onClick={() => grant.mutate()}
          >
            {t('assign')}
          </Button>
        </div>
      ) : (
        <div className="tr-cell tr-cell-static">
          <Button variant="ghost" size="sm" icon="plus" onClick={() => setAdding(true)}>
            {t('assignTeacher')}
          </Button>
        </div>
      )}
      {grant.error ? <Callout tone="bad">{errorText(grant.error)}</Callout> : null}
      {(staff.data ?? []).length === 0 && staff.data ? (
        <div className="tr-cell tr-cell-static">
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{t('teachersNote')}</span>
        </div>
      ) : null}
    </ListGroup>
  );
}

function UsageCard() {
  const t = useT(settingsDict);
  const api = useAdminApi();
  const q = useQuery({ queryKey: ['ai-usage'], queryFn: () => api.aiUsage() });
  const u = q.data;
  const max = Math.max(1, ...(u?.topStudents.map((s) => s.tokens) ?? [1]));
  const calls = (n: number) =>
    `${num(n)} ${plural(n, {
      ru: [t('callOne'), t('callFew'), t('callMany')],
      en: [t('callOne'), t('callFew')],
    })}`;
  return (
    <Card
      desktop
      title={t('aiSpend', { month: u ? monthLabel(u.month) : '…' })}
      meta={u ? calls(u.calls) : undefined}
    >
      {q.isLoading ? <Loading /> : null}
      {q.error ? <ErrorBox error={q.error} /> : null}
      {u ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span
              style={{
                fontSize: 32,
                lineHeight: '36px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
              }}
            >
              {money(u.costUsd)}
            </span>
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              {t('tokensPerStudent', {
                tokens: tokensShort(u.tokens),
                money: money(u.perActiveStudentUsd),
              })}
            </span>
          </div>
          <span className="tr-eyebrow">{t('byPurpose')}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {u.byPurpose.map((p) => (
              <Badge
                key={p.purpose}
                tone="neutral"
                title={t('callsTokens', { calls: calls(p.calls), tokens: tokensShort(p.tokens) })}
              >
                {purposeLabel(p.purpose)}: {money(p.costUsd)}
              </Badge>
            ))}
            {u.byPurpose.length === 0 ? (
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{t('noCalls')}</span>
            ) : null}
          </div>
          <span className="tr-eyebrow">{t('topByTokens')}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {u.topStudents.map((s) => (
              <div
                key={s.studentId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '150px minmax(0, 1fr) 70px',
                  gap: 10,
                  alignItems: 'center',
                  fontSize: 13,
                }}
              >
                <span
                  style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {s.name ?? s.studentId.slice(0, 8)}
                </span>
                <span className="ad-bar">
                  <span
                    title={t('nameTokens', { name: s.name ?? '', tokens: tokensShort(s.tokens) })}
                    style={{ width: `${Math.round((s.tokens / max) * 100)}%` }}
                  />
                </span>
                <span className="ad-num" style={{ textAlign: 'right', color: 'var(--ink-2)' }}>
                  {tokensShort(s.tokens)}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </Card>
  );
}
