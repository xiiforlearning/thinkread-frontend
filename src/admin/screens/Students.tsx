import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Report, Word } from '../../api/types';
import { studentsDict } from '../../i18n/admin/students';
import { plural, useT } from '../../i18n/t';
import { fmtRelative } from '../../lib/dates';
import {
  Avatar,
  Badge,
  Button,
  Callout,
  Card,
  Cell,
  ChatMessage,
  Chip,
  Composer,
  DayCell,
  HealthDot,
  Icon,
  IconButton,
  ListGroup,
  NormCell,
  SearchField,
  Select,
  StatTile,
  TextField,
} from '../../ui/components';
import type { ChatReply, FlagView, Health, StudentCard, StudentRow } from '../api';
import {
  flagStatusLabel,
  fmtDay,
  fmtWeek,
  groupsOf,
  HEALTH_TONE,
  levelOf,
  reportMeta,
  reportText,
  silence,
} from '../format';
import { appendChat, useChat } from '../chatStore';
import { Empty, ErrorBox, errorText, Loading, Shell, SoonBadge } from '../Shell';
import { useAdminApi, useIsOwner } from '../session';
import { ReportDialog } from './ReportDialog';

type HealthFilter = 'all' | Health | 'pending' | 'archived';

/** 12 · Студенты: list pane (search, health chips, group) + the selected student's card. */
export function StudentsScreen() {
  const t = useT(studentsDict);
  const api = useAdminApi();
  const navigate = useNavigate();
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [health, setHealth] = useState<HealthFilter>(
    (params.get('health') as HealthFilter) ?? 'all',
  );
  const group = params.get('group') ?? '';

  const groups = useQuery({ queryKey: ['groups'], queryFn: () => api.groups.list() });
  const list = useQuery({
    queryKey: ['students', { q, health, group }],
    queryFn: () =>
      api.students.list({
        q: q || undefined,
        // 'pending' and 'archived' are statuses, not healths: the API lists ACTIVE + PENDING_NAME
        // unless a status is asked for
        health:
          health === 'all' || health === 'pending' || health === 'archived' ? undefined : health,
        status:
          health === 'archived' ? 'ARCHIVED' : health === 'pending' ? 'PENDING_NAME' : undefined,
        groupChatId: group ? Number(group) : undefined,
      }),
  });
  const rows = list.data ?? [];
  const firstId = rows[0]?.id;

  // Without an id the first row (most problematic) is selected, like the artboard.
  useEffect(() => {
    if (!id && firstId) navigate(`/students/${firstId}`, { replace: true });
  }, [id, firstId, navigate]);

  const chips: Array<[HealthFilter, string]> = [
    ['all', t('chipAll')],
    ['bad', t('chipBad')],
    ['warn', t('chipWarn')],
    ['good', t('chipGood')],
    ['pending', t('chipPending')],
    ['archived', t('chipArchived')],
  ];
  const pane = (
    <section className="ad-pane">
      <div className="ad-pane-head">
        <h1 className="ad-h2">{t('title')}</h1>
        <SearchField
          placeholder={t('searchByName')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {chips.map(([key, label]) => (
            <Chip key={key} selected={health === key} onClick={() => setHealth(key)}>
              {label}
            </Chip>
          ))}
        </div>
        <Select
          size="sm"
          label={t('group')}
          value={group}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            if (e.target.value) next.set('group', e.target.value);
            else next.delete('group');
            setParams(next, { replace: true });
          }}
          options={[
            { value: '', label: t('groupAll') },
            ...(groups.data ?? []).map((g) => ({ value: String(g.chatId), label: g.title })),
          ]}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="tr-eyebrow">
            {t('worstFirst', { n: rows.length })}
            {list.data ? '' : '…'}
          </span>
          <span className="ad-norm-legend" aria-hidden="true">
            <span>
              <Icon name="book" style={{ width: 12, height: 12 }} />
              {t('colReading')}
            </span>
            <span>
              <Icon name="headphones" style={{ width: 12, height: 12 }} />
              {t('colListening')}
            </span>
          </span>
        </div>
      </div>
      <div className="ad-pane-list">
        {list.isLoading ? <Loading /> : null}
        {list.error ? <ErrorBox error={list.error} retry={() => list.refetch()} /> : null}
        {list.data && rows.length === 0 ? <Empty>{t('nobodyFound')}</Empty> : null}
        {rows.map((s) => (
          <StudentCell key={s.id} s={s} current={s.id === id} />
        ))}
      </div>
    </section>
  );

  return (
    <Shell pane={pane}>{id ? <StudentDetail id={id} /> : <Empty>{t('pickStudent')}</Empty>}</Shell>
  );
}

function StudentCell({ s, current }: { s: StudentRow; current: boolean }) {
  return (
    <Cell
      to={`/students/${s.id}`}
      current={current}
      avatar={s.name}
      avatarTone={HEALTH_TONE[s.health]}
      title={s.name}
      subtitle={`${silence(s.silentDays, s.dmBlocked)} · ${groupsOf(s)}`}
      norms={`${s.week.reading}/${s.week.readingNorm} ${s.week.listening}/${s.week.listeningNorm}`}
      normIcons
      health={s.health}
      flag={s.newFlags > 0}
    />
  );
}

function wash(done: number, norm: number): 'good' | 'warn' | 'bad' {
  return done >= norm ? 'good' : done > 0 ? 'warn' : 'bad';
}

function StudentDetail({ id }: { id: string }) {
  const t = useT(studentsDict);
  const api = useAdminApi();
  const owner = useIsOwner();
  const qc = useQueryClient();
  const card = useQuery({ queryKey: ['student', id], queryFn: () => api.students.one(id) });
  const reports = useQuery({
    queryKey: ['student-reports', id],
    queryFn: () => api.students.reports(id, 50),
  });
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [showWords, setShowWords] = useState(false);
  const [parent, setParent] = useState<ChatReply | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openReport, setOpenReport] = useState<string | null>(null);

  useEffect(() => {
    setRenaming(false);
    setShowWords(false);
    setParent(null);
    setNotice(null);
    setOpenReport(null);
  }, [id]);

  const apply = (next: StudentCard) => {
    qc.setQueryData(['student', id], next);
    void qc.invalidateQueries({ queryKey: ['students'] });
    void qc.invalidateQueries({ queryKey: ['overview'] });
  };
  const rename = useMutation({
    mutationFn: (name: string | null) => api.students.rename(id, name),
    onSuccess: (next) => {
      apply(next);
      setRenaming(false);
    },
  });
  const archive = useMutation({
    mutationFn: (restore: boolean) =>
      restore ? api.students.restore(id) : api.students.archive(id),
    onSuccess: apply,
  });
  const recheck = useMutation({
    mutationFn: () => api.students.recheck(id),
    onSuccess: (res) => {
      apply(res);
      setNotice(
        res.action === 'NONE' || res.action === 'KEEP'
          ? t('membershipConfirmed')
          : t('recheckResult', {
              action: res.action,
              level: res.levelChanged ? t('levelUpdated') : '',
            }),
      );
    },
  });
  const review = useMutation({
    mutationFn: (v: { flagId: string; status: 'REVIEWED' | 'DISMISSED' }) =>
      api.flags.review(v.flagId, v.status),
    onSuccess: (flag) => {
      const cur = qc.getQueryData<StudentCard>(['student', id]);
      if (cur)
        apply({
          ...cur,
          flags: cur.flags.map((f) =>
            f.id === flag.id ? { ...f, ...flag, student: f.student } : f,
          ),
        });
      void qc.invalidateQueries({ queryKey: ['flags'] });
      void qc.invalidateQueries({ queryKey: ['nav-counts'] });
    },
  });
  const parentReport = useMutation({
    mutationFn: () => api.ai.parentReport(id),
    onSuccess: setParent,
  });

  if (card.isLoading) return <Loading />;
  if (card.error) return <ErrorBox error={card.error} retry={() => card.refetch()} />;
  if (!card.data) return null;
  const { student: s, calendar, words, flags, canEdit } = card.data;
  const archived = s.status === 'ARCHIVED';
  const pending = s.status === 'PENDING_NAME';
  const thisWeek = calendar[0];
  const newFlags = flags.filter((f) => f.status === 'NEW').length;
  const activityDays = new Set((reports.data?.data ?? []).map((r) => r.createdAt.slice(0, 10)));
  const mutationError = [rename, archive, recheck, review, parentReport].find(
    (m) => m.error,
  )?.error;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar name={s.name} size="lg" tone={HEALTH_TONE[s.health]} />
          <div
            style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}
          >
            {renaming ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  rename.mutate(draft.trim() || null);
                }}
                style={{ display: 'flex', gap: 8, maxWidth: 420, alignItems: 'flex-end' }}
              >
                <TextField
                  label={t('displayName')}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  style={{ flexGrow: 1 }}
                  autoFocus
                />
                <Button variant="primary" size="md" type="submit" loading={rename.isPending}>
                  {t('save')}
                </Button>
                <Button variant="ghost" size="md" onClick={() => setRenaming(false)}>
                  {t('cancel')}
                </Button>
              </form>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 className="ad-h2" style={{ whiteSpace: 'nowrap' }}>
                  {s.name}
                </h2>
                {canEdit ? (
                  <IconButton
                    icon="edit"
                    label={t('rename')}
                    size="sm"
                    quiet
                    onClick={() => {
                      setDraft(s.displayName ?? '');
                      setRenaming(true);
                    }}
                  />
                ) : null}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                gap: 12,
                fontSize: 13,
                color: 'var(--ink-2)',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <HealthDot status={s.health} />
              <Badge
                tone={archived ? 'neutral' : s.dmBlocked ? 'bad' : pending ? 'warn' : 'good'}
                title={s.dmBlocked && !archived ? t('botBlockedHint') : undefined}
              >
                {archived
                  ? t('archived')
                  : s.dmBlocked
                    ? t('botBlocked')
                    : pending
                      ? t('pending')
                      : t('accessActive')}
              </Badge>
              <span>
                {groupsOf(s)} · {levelOf(s.level)}
              </span>
              {s.username ? <span>@{s.username}</span> : null}
              <span>
                {t('activity', { when: s.lastActivityAt ? fmtRelative(s.lastActivityAt) : '—' })}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="dark"
            size="sm"
            icon="copy"
            disabled={!api.features.parentReport}
            loading={parentReport.isPending}
            onClick={() => (parent ? setParent(null) : parentReport.mutate())}
          >
            {parentReport.isPending ? t('gatheringFacts') : t('parentReport')}
          </Button>
          {!api.features.parentReport ? <SoonBadge /> : null}
          {owner ? (
            <Button
              variant="secondary"
              size="sm"
              loading={archive.isPending}
              onClick={() => {
                if (archived || window.confirm(t('archiveConfirm', { name: s.name })))
                  archive.mutate(archived);
              }}
            >
              {archived ? t('restore') : t('archive')}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            icon="refresh"
            loading={recheck.isPending}
            onClick={() => recheck.mutate()}
          >
            {recheck.isPending ? t('rechecking') : t('recheck')}
          </Button>
        </div>
      </div>

      {s.dmBlocked && !archived ? (
        <Callout tone="warn" title={t('botBlocked')}>
          {t('botBlockedHint')}
        </Callout>
      ) : null}
      {notice ? <Callout tone="info">{notice}</Callout> : null}
      {mutationError ? <Callout tone="bad">{errorText(mutationError)}</Callout> : null}

      {parent ? (
        <Card desktop title={t('parentReportTitle')} meta={t('currentMonth')}>
          <p className="ad-box">{parent.text}</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <CopyButton text={parent.text} />
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{t('parentReportNote')}</span>
          </div>
        </Card>
      ) : null}

      <div className="ad-grid ad-grid-4" style={{ gap: 12 }}>
        <StatTile label={t('words')} value={words.total} />
        <StatTile label={t('learned')} value={words.learned} tone="good" />
        <StatTile
          label={t('readingWeek')}
          value={thisWeek ? `${thisWeek.reading.done}/${thisWeek.reading.norm}` : '—'}
          wash={thisWeek ? wash(thisWeek.reading.done, thisWeek.reading.norm) : undefined}
        />
        <StatTile
          label={t('listeningWeek')}
          value={thisWeek ? `${thisWeek.listening.done}/${thisWeek.listening.norm}` : '—'}
          wash={thisWeek ? wash(thisWeek.listening.done, thisWeek.listening.norm) : undefined}
        />
      </div>

      <Card
        desktop
        title={t('quietFlags')}
        meta={
          newFlags
            ? `${newFlags} ${plural(newFlags, {
                ru: [t('newOne'), t('newFew'), t('newMany')],
                en: [t('newOne'), t('newFew')],
              })}`
            : t('noNew')
        }
      >
        {flags.length === 0 ? (
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{t('noFlags')}</span>
        ) : null}
        {flags.map((f) => (
          <FlagRow
            key={f.id}
            f={f}
            busy={review.isPending && review.variables?.flagId === f.id}
            onReview={(status) => review.mutate({ flagId: f.id, status })}
          />
        ))}
      </Card>

      <TeacherChat id={id} name={s.name} />

      <Card desktop title={t('normsByWeek')} meta={t('normsMeta')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {calendar.map((w) => (
            <div
              key={w.weekStart}
              style={{
                display: 'grid',
                gridTemplateColumns: '88px 44px 44px minmax(0, 1fr)',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{fmtWeek(w.weekStart)}</span>
              <NormCell
                value={w.reading.done}
                max={w.reading.norm}
                title={t('reading')}
                icon="book"
              />
              <NormCell
                value={w.listening.done}
                max={w.listening.norm}
                title={t('listening')}
                icon="headphones"
              />
              <span
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: 3,
                }}
              >
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(`${w.weekStart}T12:00:00`);
                  d.setDate(d.getDate() + i);
                  const key = d.toISOString().slice(0, 10);
                  const has = activityDays.has(key);
                  return (
                    <DayCell
                      key={key}
                      level={has ? 2 : 0}
                      title={`${fmtDay(d, { weekday: true })}: ${has ? t('dayReport') : t('dayNoReports')}`}
                    />
                  );
                })}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <ListGroup desktop header={t('feed')}>
        {reports.isLoading ? <Loading /> : null}
        {reports.data && reports.data.data.length === 0 ? (
          <div className="tr-cell tr-cell-static">
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{t('noReports')}</span>
          </div>
        ) : null}
        {(reports.data?.data ?? []).slice(0, 12).map((r) => (
          <ReportCell key={r.id} r={r} onOpen={() => setOpenReport(r.id)} />
        ))}
        <div className="tr-cell tr-cell-static">
          <Button variant="ghost" size="sm" icon="book" onClick={() => setShowWords((v) => !v)}>
            {showWords ? t('hideWords') : t('showWords', { n: words.total })}
          </Button>
        </div>
      </ListGroup>
      {showWords ? <WordsCard id={id} /> : null}
      {openReport ? (
        <ReportDialog
          id={openReport}
          student={{ id: s.id, name: s.name }}
          onClose={() => setOpenReport(null)}
        />
      ) : null}
    </>
  );
}

function FlagRow({
  f,
  busy,
  onReview,
}: {
  f: FlagView;
  busy: boolean;
  onReview: (s: 'REVIEWED' | 'DISMISSED') => void;
}) {
  const t = useT(studentsDict);
  const open = f.status === 'NEW';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 14px',
        borderRadius: 12,
        background: open ? 'var(--bad-wash)' : 'var(--surface-2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge tone="code">{f.kind}</Badge>
        <span style={{ fontSize: 12, color: 'var(--ink-2)', flexGrow: 1 }}>
          {fmtDay(f.createdAt, { weekday: true })}
        </span>
        <Badge tone={open ? 'bad' : 'neutral'}>{flagStatusLabel(f.status)}</Badge>
      </div>
      <span style={{ fontSize: 13, lineHeight: '18px' }}>{f.reason ?? '—'}</span>
      {open ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button variant="dark" size="sm" loading={busy} onClick={() => onReview('REVIEWED')}>
            {t('reviewed')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={busy}
            onClick={() => onReview('DISMISSED')}
          >
            {t('falseAlarm')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** One report in a feed; with `onOpen` the row opens the whole report (D7). */
export function ReportCell({
  r,
  onOpen,
}: {
  r: Report & { rawText?: string };
  onOpen?: () => void;
}) {
  const t = useT(studentsDict);
  const text = reportText(r);
  return (
    <Cell
      cover={r.type === 'READING' ? (r.sourceTitle ?? t('book')) : undefined}
      podcast={r.type === 'LISTENING'}
      title={
        <span style={{ fontWeight: 400 }}>
          «{text.length > 160 ? `${text.slice(0, 160)}…` : text}»
        </span>
      }
      subtitle={reportMeta(r)}
      date={fmtDay(r.createdAt, { weekday: true })}
      onClick={onOpen}
      chevron={!!onOpen}
    />
  );
}

/** Saves a text body as a file in the browser (the API returns the content, not a URL). */
function saveText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function WordsCard({ id }: { id: string }) {
  const t = useT(studentsDict);
  const api = useAdminApi();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['student-words', id], queryFn: () => api.students.words(id) });
  // W5: the teacher removes a word; D9: the whole dictionary as CSV (archived students too).
  const remove = useMutation({
    mutationFn: (wordId: string) => api.students.removeWord(id, wordId),
    onSuccess: (_w, wordId) => {
      qc.setQueryData<Word[]>(['student-words', id], (cur) =>
        cur ? cur.filter((w) => w.id !== wordId) : cur,
      );
      void qc.invalidateQueries({ queryKey: ['student', id] });
      void qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
  const exportCsv = useMutation({
    mutationFn: () => api.students.exportWords(id, 'csv'),
    onSuccess: (file) => saveText(file.filename, file.content, 'text/csv'),
  });
  // The teacher corrects a typo or a wrong sense right in the table.
  const editWord = useMutation({
    mutationFn: (v: { wordId: string; word: string; translation: string }) =>
      api.students.editWord(id, v.wordId, { word: v.word, translation: v.translation }),
    onSuccess: (saved) => {
      qc.setQueryData<Word[]>(['student-words', id], (cur) =>
        cur ? cur.map((w) => (w.id === saved.id ? saved : w)) : cur,
      );
      void qc.invalidateQueries({ queryKey: ['report'] });
    },
  });
  return (
    <Card
      desktop
      title={t('studentWords')}
      meta={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {t('last100')}
          <Button
            variant="ghost"
            size="sm"
            icon="download"
            loading={exportCsv.isPending}
            onClick={() => exportCsv.mutate()}
          >
            {t('exportCsv')}
          </Button>
        </span>
      }
    >
      {q.isLoading ? <Loading /> : null}
      {q.error ? <ErrorBox error={q.error} /> : null}
      {remove.error ? <Callout tone="bad">{errorText(remove.error)}</Callout> : null}
      {exportCsv.error ? <Callout tone="bad">{errorText(exportCsv.error)}</Callout> : null}
      {editWord.error ? <Callout tone="bad">{errorText(editWord.error)}</Callout> : null}
      {q.data ? (
        <WordsTable
          words={q.data}
          removing={remove.isPending ? remove.variables : null}
          onRemove={(w) => {
            if (window.confirm(t('removeWordConfirm', { word: w.word }))) remove.mutate(w.id);
          }}
          saving={editWord.isPending ? editWord.variables?.wordId : null}
          onEdit={(w, word, translation) =>
            editWord.mutateAsync({ wordId: w.id, word, translation }).then(
              () => true,
              () => false,
            )
          }
        />
      ) : null}
    </Card>
  );
}

const WORD_COLS = 'minmax(0, 1fr) minmax(0, 1fr) 70px 80px 90px 72px';

function WordsTable({
  words,
  removing,
  onRemove,
  saving,
  onEdit,
}: {
  words: Word[];
  removing: string | null;
  onRemove: (w: Word) => void;
  saving: string | null | undefined;
  /** Resolves true when the edit was saved (the row then leaves edit mode). */
  onEdit: (w: Word, word: string, translation: string) => Promise<boolean>;
}) {
  const t = useT(studentsDict);
  const [editing, setEditing] = useState<string | null>(null);
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  if (words.length === 0)
    return <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{t('emptyWords')}</span>;
  const start = (w: Word) => {
    setEditing(w.id);
    setWord(w.word);
    setTranslation(w.translation ?? '');
  };
  const submit = async (w: Word) => {
    const nextWord = word.trim();
    if (!nextWord) return;
    if (await onEdit(w, nextWord, translation.trim())) setEditing(null);
  };
  return (
    <div className="ad-scroll">
      <div className="ad-table ad-table-head" style={{ gridTemplateColumns: WORD_COLS }}>
        <span>{t('colWord')}</span>
        <span>{t('colTranslation')}</span>
        <span>CEFR</span>
        <span>{t('colStage')}</span>
        <span>{t('colStatus')}</span>
        <span />
      </div>
      {words.map((w) =>
        editing === w.id ? (
          <form
            key={w.id}
            className="ad-table"
            style={{ gridTemplateColumns: WORD_COLS }}
            onSubmit={(e) => {
              e.preventDefault();
              void submit(w);
            }}
          >
            <TextField
              value={word}
              onChange={(e) => setWord(e.target.value)}
              aria-label={t('colWord')}
              autoFocus
              disabled={saving === w.id}
            />
            <TextField
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              aria-label={t('colTranslation')}
              placeholder={t('translationEmpty')}
              disabled={saving === w.id}
            />
            <span>{w.cefr ?? '—'}</span>
            <span>{w.status === 'LEARNED' ? '—' : t('stageOf', { stage: w.stage })}</span>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{t('editWordHint')}</span>
            {/* Two text fields need a submit button for Enter to submit the form. */}
            <button type="submit" style={{ display: 'none' }} aria-hidden="true" />
            <span style={{ display: 'flex', gap: 2 }}>
              <IconButton
                icon="check"
                label={t('save')}
                size="sm"
                quiet
                loading={saving === w.id}
                onClick={() => void submit(w)}
              />
              <IconButton
                icon="close"
                label={t('cancel')}
                size="sm"
                quiet
                disabled={saving === w.id}
                onClick={() => setEditing(null)}
              />
            </span>
          </form>
        ) : (
          <div key={w.id} className="ad-table" style={{ gridTemplateColumns: WORD_COLS }}>
            <span style={{ fontWeight: 600 }}>{w.word}</span>
            <span style={{ color: 'var(--ink-2)' }}>{w.translation ?? '—'}</span>
            <span>{w.cefr ?? '—'}</span>
            <span>{w.status === 'LEARNED' ? '—' : t('stageOf', { stage: w.stage })}</span>
            <span>
              {w.status === 'LEARNED' ? (
                <Badge tone="good">{t('wordLearned')}</Badge>
              ) : (
                <Badge tone="neutral">{t('wordLearning')}</Badge>
              )}
            </span>
            <span style={{ display: 'flex', gap: 2 }}>
              <IconButton
                icon="edit"
                label={t('editWord')}
                size="sm"
                quiet
                onClick={() => start(w)}
              />
              <IconButton
                icon="close"
                label={t('removeWord')}
                size="sm"
                quiet
                loading={removing === w.id}
                onClick={() => onRemove(w)}
              />
            </span>
          </div>
        ),
      )}
    </div>
  );
}

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const t = useT(studentsDict);
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant={copied ? 'good' : 'tonal'}
      size="sm"
      icon="copy"
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? t('copied') : (label ?? t('copy'))}
    </Button>
  );
}

/** "Спросить AI" — the teacher's per-student chat (AiPurpose.TEACHER_CHAT, stage 8). */
function TeacherChat({ id, name }: { id: string; name: string }) {
  const t = useT(studentsDict);
  const api = useAdminApi();
  // One conversation per student, kept in chatStore so it survives switching screens.
  const chatKey = `student:${id}`;
  const chat = useChat(chatKey);
  const [draft, setDraft] = useState('');
  useEffect(() => setDraft(''), [id]);
  const ask = useMutation({
    mutationFn: (question: string) =>
      api.ai.ask(
        id,
        question,
        chat.map((m) => ({ role: m.from === 'me' ? 'teacher' : 'ai', text: m.text })),
      ),
    onSuccess: (reply) =>
      appendChat(chatKey, { from: 'ai', text: reply.text, copyable: reply.copyable }),
  });
  const send = (question: string) => {
    appendChat(chatKey, { from: 'me', text: question });
    setDraft('');
    ask.mutate(question);
  };
  const first = useMemo(() => name.split(' ')[0], [name]);
  const prompts = [t('promptMonth'), t('promptWorse'), t('promptStuck'), t('promptDraft')];
  return (
    <Card desktop title={t('askAi')} meta={t('askAiMeta')}>
      {!api.features.teacherChat ? (
        <Callout tone="info" title={t('soonTitle')}>
          {t('soonText')}
        </Callout>
      ) : null}
      <div className="ad-chat">
        {chat.map((m, i) => (
          <ChatMessage
            key={i}
            from={m.from}
            who={m.from === 'me' ? t('you') : t('aiByData', { name: first })}
            actions={m.copyable ? <CopyButton text={m.text} label={t('copyDraft')} /> : undefined}
          >
            <span style={{ whiteSpace: 'pre-line' }}>{m.text}</span>
          </ChatMessage>
        ))}
      </div>
      {ask.isPending ? (
        <Callout tone="info" icon="spinner">
          {t('gatheringPeriod')}
        </Callout>
      ) : null}
      {ask.error ? <Callout tone="bad">{errorText(ask.error)}</Callout> : null}
      <Composer
        value={draft}
        onChange={setDraft}
        onSend={send}
        placeholder={t('askPlaceholder')}
        sendLabel={t('ask')}
        disabled={!api.features.teacherChat || ask.isPending}
        hint={chat.length === 0 && !ask.isPending ? t('askHint') : undefined}
      >
        {prompts.map((p) => (
          <Chip
            key={p}
            disabled={!api.features.teacherChat || ask.isPending}
            onClick={() => send(p)}
          >
            {p}
          </Chip>
        ))}
      </Composer>
    </Card>
  );
}
