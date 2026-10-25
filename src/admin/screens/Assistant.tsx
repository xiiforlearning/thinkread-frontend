import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { assistantDict } from '../../i18n/admin/assistant';
import { useT } from '../../i18n/t';
import { Callout, Card, ChatMessage, Chip, Composer } from '../../ui/components';
import { errorText, PageHead, Shell } from '../Shell';
import { useAdminApi, useIsOwner } from '../session';

interface Msg {
  from: 'me' | 'ai';
  text: string;
}

type PromptKey = keyof typeof assistantDict.ru;
const PROMPTS_OWNER: PromptKey[] = [
  'promptBehindReading',
  'promptBehindListening',
  'promptCompareGroups',
  'promptWeekSummary',
  'promptNewFlags',
];
const PROMPTS_TEACHER: PromptKey[] = [
  'promptBehindMyGroups',
  'promptWeekSummary',
  'promptNewFlags',
];

/** AI по всей школе (B1): вопрос по школе или по группам учителя, ответ по фактам, которые посчитала система. */
export function AssistantScreen() {
  const t = useT(assistantDict);
  const api = useAdminApi();
  const owner = useIsOwner();
  const [chat, setChat] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const ask = useMutation({
    mutationFn: (question: string) =>
      api.ai.askSchool(
        question,
        chat.map((m) => ({ role: m.from === 'me' ? 'teacher' : 'ai', text: m.text })),
      ),
    onSuccess: (reply) => setChat((c) => [...c, { from: 'ai', text: reply.text }]),
  });
  const send = (question: string) => {
    const q = question.trim();
    if (!q) return;
    setChat((c) => [...c, { from: 'me', text: q }]);
    setDraft('');
    ask.mutate(q);
  };
  const prompts = (owner ? PROMPTS_OWNER : PROMPTS_TEACHER).map((k) => t(k));
  return (
    <Shell>
      <PageHead title={t('title')} subtitle={owner ? t('subtitleOwner') : t('subtitleTeacher')} />
      <Card desktop title={t('ask')} meta={t('askMeta')}>
        {chat.length === 0 ? (
          <Callout tone="info" title={t('whatItDoes')}>
            {t('whatItDoesText')}
          </Callout>
        ) : null}
        <div className="ad-chat">
          {chat.map((m, i) => (
            <ChatMessage
              key={i}
              from={m.from}
              who={m.from === 'me' ? t('you') : owner ? t('aiSchool') : t('aiGroups')}
            >
              <span style={{ whiteSpace: 'pre-line' }}>{m.text}</span>
            </ChatMessage>
          ))}
        </div>
        {ask.isPending ? (
          <Callout tone="info" icon="spinner">
            {owner ? t('gatheringSchool') : t('gatheringGroups')}
          </Callout>
        ) : null}
        {ask.error ? <Callout tone="bad">{errorText(ask.error)}</Callout> : null}
        <Composer
          value={draft}
          onChange={setDraft}
          onSend={send}
          placeholder={t('placeholder')}
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
    </Shell>
  );
}
