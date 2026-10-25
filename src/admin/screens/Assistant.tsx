import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Callout, Card, ChatMessage, Chip, Composer } from '../../ui/components';
import { errorText, PageHead, Shell } from '../Shell';
import { useAdminApi, useIsOwner } from '../session';

interface Msg {
  from: 'me' | 'ai';
  text: string;
}

const PROMPTS_OWNER = [
  'Кто отстаёт по чтению?',
  'Кто отстаёт по аудированию?',
  'Сравни группы',
  'Итоги недели',
  'У кого новые пометки?',
];
const PROMPTS_TEACHER = ['Кто отстаёт в моих группах?', 'Итоги недели', 'У кого новые пометки?'];

/** AI по всей школе (B1): вопрос по школе или по группам учителя, ответ по фактам, которые посчитала система. */
export function AssistantScreen() {
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
  const prompts = owner ? PROMPTS_OWNER : PROMPTS_TEACHER;
  return (
    <Shell>
      <PageHead
        title="AI по школе"
        subtitle={
          owner
            ? 'Вопросы по всем студентам и группам. Цифры считает система, AI только объясняет.'
            : 'Вопросы по вашим группам. Цифры считает система, AI только объясняет.'
        }
      />
      <Card desktop title="Спросить" meta="последние 4 недели · ничего не сохраняется">
        {chat.length === 0 ? (
          <Callout tone="info" title="Что умеет">
            Кто отстаёт и по чему, сравнение групп, итоги недели, у кого появились пометки. AI видит
            только посчитанные факты: нормы по неделям, здоровье, словарь, количество флагов. Тексты
            отчётов ему не передаются.
          </Callout>
        ) : null}
        <div className="ad-chat">
          {chat.map((m, i) => (
            <ChatMessage
              key={i}
              from={m.from}
              who={
                m.from === 'me' ? 'Вы' : owner ? 'AI · по данным школы' : 'AI · по вашим группам'
              }
            >
              <span style={{ whiteSpace: 'pre-line' }}>{m.text}</span>
            </ChatMessage>
          ))}
        </div>
        {ask.isPending ? (
          <Callout tone="info" icon="spinner">
            Собираю факты по {owner ? 'школе' : 'группам'}…
          </Callout>
        ) : null}
        {ask.error ? <Callout tone="bad">{errorText(ask.error)}</Callout> : null}
        <Composer
          value={draft}
          onChange={setDraft}
          onSend={send}
          placeholder="Например: кто отстаёт по чтению на этой неделе?"
          sendLabel="Спросить"
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
