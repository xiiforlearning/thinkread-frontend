import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import type { GroupLevel } from '../../api/types';
import { groupsDict } from '../../i18n/admin/groups';
import { tr, useT } from '../../i18n/t';
import { words } from '../../lib/dates';
import { LEVEL_LABEL } from '../../lib/labels';
import {
  Badge,
  Button,
  Callout,
  Card,
  ListGroup,
  Select,
  TextArea,
  TextField,
} from '../../ui/components';
import type { GroupView, WordListView } from '../api';
import { fmtDay, levelOf, pct } from '../format';
import { ErrorBox, errorText, Loading, PageHead, Shell } from '../Shell';
import { useAdminApi, useIsOwner } from '../session';

const LEVELS = Object.keys(LEVEL_LABEL) as GroupLevel[];
const COLS = 'minmax(0, 1.2fr) 190px 90px 190px 110px';
const LIST_COLS = 'minmax(0, 1.4fr) 104px 40px 60px 56px 48px 76px';

/** 14 · Группы: levels, membership checks, teacher word lists. */
export function GroupsScreen() {
  const t = useT(groupsDict);
  const api = useAdminApi();
  const owner = useIsOwner();
  const qc = useQueryClient();
  const groups = useQuery({ queryKey: ['groups'], queryFn: () => api.groups.list() });
  const checks = useQuery({
    queryKey: ['membership-checks'],
    queryFn: () => api.groups.membershipChecks(),
    refetchInterval: 15_000,
  });
  const lists = useQuery({ queryKey: ['word-lists'], queryFn: () => api.wordLists.list() });
  const setLevel = useMutation({
    mutationFn: (v: { chatId: number; level: GroupLevel }) =>
      api.groups.setLevel(v.chatId, v.level),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['groups'] }),
  });
  const run = useMutation({
    mutationFn: () => api.groups.runCheck(),
    onSuccess: () =>
      setTimeout(() => void qc.invalidateQueries({ queryKey: ['membership-checks'] }), 3000),
  });
  const toggle = useMutation({
    mutationFn: (l: WordListView) =>
      api.wordLists.patch(l.id, { status: l.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['word-lists'] }),
  });
  const byChat = new Map((groups.data ?? []).map((g) => [g.chatId, g.title]));
  return (
    <Shell>
      <PageHead title={t('title')} subtitle={t('subtitle')} />
      {groups.isLoading ? <Loading /> : null}
      {groups.error ? <ErrorBox error={groups.error} retry={() => groups.refetch()} /> : null}
      {setLevel.error ? <Callout tone="bad">{errorText(setLevel.error)}</Callout> : null}
      {groups.data ? (
        <ListGroup desktop>
          <div className="tr-cell tr-cell-static" style={{ paddingTop: 10, paddingBottom: 10 }}>
            <div
              className="ad-table ad-table-head"
              style={{ gridTemplateColumns: COLS, width: '100%', border: 0, padding: 0 }}
            >
              <span>{t('colGroup')}</span>
              <span>{t('colLevel')}</span>
              <span>{t('colStudents')}</span>
              <span>{t('colWeekNorm')}</span>
              <span>{t('colStatus')}</span>
            </div>
          </div>
          {groups.data.length === 0 ? (
            <div className="tr-cell tr-cell-static">
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{t('noGroups')}</span>
            </div>
          ) : null}
          {groups.data.map((g) => (
            <GroupRow
              key={g.chatId}
              g={g}
              owner={owner}
              busy={setLevel.isPending && setLevel.variables?.chatId === g.chatId}
              onLevel={(level) => setLevel.mutate({ chatId: g.chatId, level })}
            />
          ))}
        </ListGroup>
      ) : null}

      <div className="ad-grid ad-grid-wide">
        <Card desktop title={t('membershipCheck')} meta={t('checkSchedule')}>
          <div
            className="ad-table ad-table-head"
            style={{ gridTemplateColumns: '110px minmax(0, 1fr) 72px 96px 84px' }}
          >
            <span>{t('colDate')}</span>
            <span>{t('colResult')}</span>
            <span>{t('colArchived')}</span>
            <span>{t('colRestored')}</span>
            <span>{t('colLevel')}</span>
          </div>
          {checks.data?.length === 0 ? (
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{t('noChecks')}</span>
          ) : null}
          {(checks.data ?? []).map((c) => (
            <div
              key={c.id}
              className="ad-table"
              style={{
                gridTemplateColumns: '110px minmax(0, 1fr) 72px 96px 84px',
                padding: '6px 0',
              }}
            >
              <span style={{ color: 'var(--ink-2)' }}>{fmtDay(c.startedAt)}</span>
              <span>
                {c.finishedAt ? t('checked', { n: c.checked }) : t('running')}
                {c.failedGroups.length
                  ? t('apiError', {
                      groups: c.failedGroups.map((id) => byChat.get(id) ?? id).join(', '),
                    })
                  : ''}
              </span>
              <span>{c.archived}</span>
              <span>{c.restored}</span>
              <span>{c.levelChanged}</span>
            </div>
          ))}
          {owner ? (
            <div>
              <Button
                variant={run.data?.started ? 'good' : 'dark'}
                size="sm"
                icon="refresh"
                loading={run.isPending}
                onClick={() => run.mutate()}
              >
                {run.data?.alreadyRunning
                  ? t('checkRunning')
                  : run.data?.started
                    ? t('checkStarted')
                    : t('runNow')}
              </Button>
            </div>
          ) : null}
          {run.error ? <Callout tone="bad">{errorText(run.error)}</Callout> : null}
        </Card>

        <Card desktop title={t('howStudentsJoin')}>
          <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)' }}>
            {t('howStudentsJoinText')}
          </span>
        </Card>
      </div>

      <div className="ad-grid ad-grid-wide">
        <Card desktop title={t('teacherLists')} meta={t('teacherListsMeta')}>
          <div className="ad-table ad-table-head" style={{ gridTemplateColumns: LIST_COLS }}>
            <span>{t('colList')}</span>
            <span>{t('colFor')}</span>
            <span>{t('colWords')}</span>
            <span>{t('colAdded')}</span>
            <span>{t('colLearned')}</span>
            <span>{t('colHidden')}</span>
            <span />
          </div>
          {lists.isLoading ? <Loading /> : null}
          {lists.data?.length === 0 ? (
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{t('noLists')}</span>
          ) : null}
          {(lists.data ?? []).map((l) => (
            <ListRow
              key={l.id}
              l={l}
              busy={toggle.isPending && toggle.variables?.id === l.id}
              onToggle={() => toggle.mutate(l)}
            />
          ))}
          <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--ink-2)' }}>
            {t('listsFooter')}
          </span>
        </Card>
        <NewListCard groups={groups.data ?? []} owner={owner} />
      </div>
    </Shell>
  );
}

function GroupRow({
  g,
  owner,
  busy,
  onLevel,
}: {
  g: GroupView;
  owner: boolean;
  busy: boolean;
  onLevel: (l: GroupLevel) => void;
}) {
  const t = useT(groupsDict);
  const rate = g.week ? (g.week.reading + g.week.listening) / 2 : 0;
  const teachers =
    g.teachers.map((x) => x.name ?? `id ${x.telegramUserId}`).join(' · ') || t('noTeacher');
  return (
    <div className="tr-cell tr-cell-static" style={{ paddingTop: 8, paddingBottom: 8 }}>
      <div
        className="ad-row"
        style={{
          display: 'grid',
          gridTemplateColumns: COLS,
          gap: 12,
          width: '100%',
          alignItems: 'center',
          fontSize: 14,
        }}
      >
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontWeight: 600 }}>{g.title}</span>
          <span
            style={{
              fontSize: 12,
              color: 'var(--ink-2)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {teachers}
          </span>
        </span>
        {owner ? (
          <Select
            size="sm"
            aria-label={t('groupLevelAria', { title: g.title })}
            value={g.level ?? ''}
            disabled={busy}
            onChange={(e) => onLevel(e.target.value as GroupLevel)}
            options={[
              ...(g.level ? [] : [{ value: '', label: t('levelNotSet') }]),
              ...LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] })),
            ]}
          />
        ) : (
          <span>{levelOf(g.level)}</span>
        )}
        <span className="ad-num">{g.members}</span>
        <span
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          title={
            g.week
              ? t('weekTitle', { reading: pct(g.week.reading), listening: pct(g.week.listening) })
              : undefined
          }
        >
          <span className="ad-bar">
            <span style={{ width: pct(rate) }} />
          </span>
          <span className="ad-num" style={{ fontSize: 13, width: 36 }}>
            {pct(rate)}
          </span>
        </span>
        <Badge tone={g.isActive ? 'good' : 'warn'}>
          {g.isActive ? t('active') : t('inactive')}
        </Badge>
      </div>
    </div>
  );
}

function scopeLabel(l: WordListView): string {
  if (l.scope === 'ALL') return tr(groupsDict, 'allStudents');
  if (l.scope === 'LEVEL') return tr(groupsDict, 'scopeLevel', { level: levelOf(l.level) });
  return l.group?.title ?? tr(groupsDict, 'scopeGroup');
}

function ListRow({ l, busy, onToggle }: { l: WordListView; busy: boolean; onToggle: () => void }) {
  const t = useT(groupsDict);
  const c = l.coverage;
  const closed = l.status === 'CLOSED';
  const addedW =
    c && c.studentsAddressed > 0 ? Math.round((c.studentsAdded / c.studentsAddressed) * 100) : 0;
  return (
    <div className="ad-table" style={{ gridTemplateColumns: LIST_COLS, opacity: closed ? 0.6 : 1 }}>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span
          style={{
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {l.title}
        </span>
        <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
          {closed ? t('listClosed') : t('listActive')}
        </span>
      </span>
      <span style={{ color: 'var(--ink-2)' }}>{scopeLabel(l)}</span>
      <span className="ad-num">{c?.words ?? '—'}</span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span className="ad-num">{c ? `${c.studentsAdded}/${c.studentsAddressed}` : '—'}</span>
        <span className="ad-bar" style={{ height: 4 }}>
          <span style={{ width: `${addedW}%` }} />
        </span>
      </span>
      <span className="ad-num" style={{ color: 'var(--good)' }}>
        {c?.wordsLearned ?? '—'}
      </span>
      <span className="ad-num" style={{ color: 'var(--ink-2)' }}>
        {c?.studentsHidden ?? '—'}
      </span>
      <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="sm" loading={busy} onClick={onToggle}>
          {closed ? t('open') : t('close')}
        </Button>
      </span>
    </div>
  );
}

function NewListCard({ groups, owner }: { groups: GroupView[]; owner: boolean }) {
  const t = useT(groupsDict);
  const api = useAdminApi();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState(groups[0] ? `G:${groups[0].chatId}` : 'ALL');
  const [text, setText] = useState('');
  const [created, setCreated] = useState<WordListView | null>(null);
  const create = useMutation({
    mutationFn: () => {
      const [kind, value] = scope.split(':');
      return api.wordLists.create({
        title: title.trim(),
        scope: kind === 'G' ? 'GROUP' : kind === 'L' ? 'LEVEL' : 'ALL',
        groupChatId: kind === 'G' ? Number(value) : undefined,
        level: kind === 'L' ? (value as GroupLevel) : undefined,
        text,
      });
    },
    onSuccess: (l) => {
      setCreated(l);
      setTitle('');
      setText('');
      void qc.invalidateQueries({ queryKey: ['word-lists'] });
    },
  });
  const options = [
    ...groups.map((g) => ({ value: `G:${g.chatId}`, label: t('optionGroup', { title: g.title }) })),
    ...(owner
      ? LEVELS.map((l) => ({ value: `L:${l}`, label: t('optionLevel', { level: LEVEL_LABEL[l] }) }))
      : []),
    ...(owner ? [{ value: 'ALL', label: t('allStudents') }] : []),
  ];
  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };
  return (
    <Card desktop title={t('newList')}>
      {created ? (
        <Callout tone="good" icon="check" title={t('listCreated')}>
          {t('listCreatedText', {
            title: created.title,
            words: words(created.coverage?.words ?? created.items?.length ?? 0),
            scope: scopeLabel(created).toLowerCase(),
          })}
        </Callout>
      ) : null}
      {create.error ? <Callout tone="bad">{errorText(create.error)}</Callout> : null}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <TextField
          label={t('titleLabel')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Unit 6 — Food"
          required
          minLength={2}
        />
        <Select
          label={t('forWhom')}
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          options={options}
        />
        <TextArea
          label={t('wordsLabel')}
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('wordsPlaceholder')}
          hint={t('wordsHint')}
          required
        />
        <Button
          variant="primary"
          size="md"
          block
          icon="list"
          type="submit"
          disabled={!title.trim() || !text.trim()}
          loading={create.isPending}
        >
          {create.isPending ? t('creating') : t('createList')}
        </Button>
      </form>
    </Card>
  );
}
