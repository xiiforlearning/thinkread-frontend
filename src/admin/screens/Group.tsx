import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { groupsDict } from '../../i18n/admin/groups';
import { useT } from '../../i18n/t';
import {
  Button,
  Callout,
  Card,
  Cell,
  ChatMessage,
  Chip,
  Composer,
  IconButton,
  ListGroup,
  StatTile,
  TextField,
} from '../../ui/components';
import { appendChat, useChat } from '../chatStore';
import { delta, HEALTH_TONE, levelOf, num, pct, silence } from '../format';
import { Empty, ErrorBox, errorText, Loading, PageHead, Shell } from '../Shell';
import { useAdminApi, useIsOwner } from '../session';

/** 14a · Группа (D12): members, norms, flags and the AI narrowed to this group. */
export function GroupScreen() {
  const t = useT(groupsDict);
  const api = useAdminApi();
  const owner = useIsOwner();
  const qc = useQueryClient();
  const { chatId = '' } = useParams();
  const id = Number(chatId);
  const q = useQuery({ queryKey: ['group', id], queryFn: () => api.groups.one(id) });
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState('');
  const rename = useMutation({
    mutationFn: (title: string) => api.groups.rename(id, title),
    onSuccess: () => {
      setRenaming(false);
      void qc.invalidateQueries({ queryKey: ['group', id] });
      void qc.invalidateQueries({ queryKey: ['groups'] });
      void qc.invalidateQueries({ queryKey: ['students'] });
      void qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });
  const d = q.data;
  if (q.isLoading)
    return (
      <Shell>
        <Loading />
      </Shell>
    );
  if (q.error || !d)
    return (
      <Shell>
        <ErrorBox error={q.error ?? new Error(t('groupNotFound'))} retry={() => q.refetch()} />
      </Shell>
    );
  const g = d.group;
  const s = d.stats;
  const teachers =
    g.teachers.map((x) => x.name ?? `id ${x.telegramUserId}`).join(' · ') || t('noTeacher');
  const r = delta(s.week.reading - s.lastWeek.reading);
  const l = delta(s.week.listening - s.lastWeek.listening);
  return (
    <Shell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Link to="/groups" style={{ fontSize: 13 }}>
          ← {t('title')}
        </Link>
        {renaming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              rename.mutate(draft.trim());
            }}
            style={{ display: 'flex', gap: 8, maxWidth: 480, alignItems: 'flex-end' }}
          >
            <TextField
              label={t('groupName')}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              hint={t('groupNameHint', { title: g.telegramTitle ?? g.title })}
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
          <PageHead
            title={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {g.title}
                {owner ? (
                  <IconButton
                    icon="edit"
                    label={t('rename')}
                    size="sm"
                    quiet
                    onClick={() => {
                      setDraft(g.telegramTitle ? g.title : '');
                      setRenaming(true);
                    }}
                  />
                ) : null}
              </span>
            }
            subtitle={`${levelOf(g.level)} · ${teachers}${g.telegramTitle ? ` · ${t('inTelegram', { title: g.telegramTitle })}` : ''}`}
          />
        )}
        {rename.error ? <Callout tone="bad">{errorText(rename.error)}</Callout> : null}
      </div>

      <div className="ad-grid ad-grid-5">
        <StatTile
          label={t('tileMembers')}
          value={num(s.members)}
          note={t('tileMembersNote', { pending: s.pending, archived: s.archived })}
        />
        <StatTile
          label={t('tileReading')}
          value={pct(s.week.reading)}
          note={r.text}
          noteTone={r.tone}
        />
        <StatTile
          label={t('tileListening')}
          value={pct(s.week.listening)}
          note={l.text}
          noteTone={l.tone}
        />
        <StatTile label={t('tileReports')} value={num(s.reportsThisWeek)} note={t('thisWeek')} />
        <StatTile
          label={t('tileFlags')}
          value={s.newFlags}
          tone={s.newFlags > 0 ? 'bad' : undefined}
          note={t('tileHealth', { good: s.health.good, warn: s.health.warn, bad: s.health.bad })}
        />
      </div>

      <div className="ad-grid ad-grid-feed">
        <div className="ad-col">
          <ListGroup desktop header={t('membersHeader', { n: d.members.length })}>
            {d.members.length === 0 ? (
              <div className="tr-cell tr-cell-static">
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{t('noMembers')}</span>
              </div>
            ) : null}
            {d.members.map((m) => (
              <Cell
                key={m.id}
                to={`/students/${m.id}`}
                avatar={m.name}
                avatarTone={HEALTH_TONE[m.health]}
                title={m.name}
                subtitle={`${silence(m.silentDays, m.dmBlocked)} · ${t('wordsN', { n: m.words.total })}`}
                norms={`${m.week.reading}/${m.week.readingNorm} ${m.week.listening}/${m.week.listeningNorm}`}
                normIcons
                health={m.health}
                flag={m.newFlags > 0}
                chevron
              />
            ))}
          </ListGroup>
          {d.pending.length > 0 ? (
            <ListGroup desktop header={t('pendingHeader', { n: d.pending.length })}>
              {d.pending.map((p) => (
                <Cell
                  key={p.id}
                  to={`/students/${p.id}`}
                  avatar={p.name}
                  avatarTone="neutral"
                  title={p.name}
                  subtitle={p.username ? `@${p.username}` : t('pendingNote')}
                  chevron
                />
              ))}
            </ListGroup>
          ) : null}
        </div>
        <GroupChat chatId={id} title={g.title} />
      </div>
    </Shell>
  );
}

function GroupChat({ chatId, title }: { chatId: number; title: string }) {
  const t = useT(groupsDict);
  const api = useAdminApi();
  const key = `group:${chatId}`;
  const chat = useChat(key);
  const [draft, setDraft] = useState('');
  const ask = useMutation({
    mutationFn: (question: string) =>
      api.groups.ask(
        chatId,
        question,
        chat.map((m) => ({ role: m.from === 'me' ? 'teacher' : 'ai', text: m.text })),
      ),
    onSuccess: (reply) => appendChat(key, { from: 'ai', text: reply.text }),
  });
  const send = (question: string) => {
    const q = question.trim();
    if (!q) return;
    appendChat(key, { from: 'me', text: q });
    setDraft('');
    ask.mutate(q);
  };
  const prompts = [t('promptBehind'), t('promptWeek'), t('promptMessage')];
  return (
    <Card desktop title={t('aiTitle', { title })} meta={t('aiMeta')}>
      {chat.length === 0 ? <Empty>{t('aiEmpty')}</Empty> : null}
      <div className="ad-chat">
        {chat.map((m, i) => (
          <ChatMessage key={i} from={m.from} who={m.from === 'me' ? t('you') : t('aiWho')}>
            <span style={{ whiteSpace: 'pre-line' }}>{m.text}</span>
          </ChatMessage>
        ))}
      </div>
      {ask.isPending ? (
        <Callout tone="info" icon="spinner">
          {t('gathering')}
        </Callout>
      ) : null}
      {ask.error ? <Callout tone="bad">{errorText(ask.error)}</Callout> : null}
      <Composer
        value={draft}
        onChange={setDraft}
        onSend={send}
        placeholder={t('aiPlaceholder')}
        sendLabel={t('ask')}
        disabled={ask.isPending}
      >
        {prompts.map((p) => (
          <Chip key={p} disabled={ask.isPending} onClick={() => send(p)}>
            {p}
          </Chip>
        ))}
      </Composer>
    </Card>
  );
}
