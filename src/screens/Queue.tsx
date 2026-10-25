import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { CardQueueEntry, WordPriority } from '../api/types';
import { useInvalidateWords } from '../app/hooks';
import { ErrorBox, Loading, Screen } from '../app/Shell';
import { useApi } from '../app/session';
import { queueDict } from '../i18n/screens/queue';
import { useT } from '../i18n/t';
import { words } from '../lib/dates';
import { stageLabel } from '../lib/labels';
import { haptic } from '../telegram/webapp';
import { Badge, Callout, Chip, LetterTile, ListGroup, type Tone } from '../ui/components';

const TONES: Tone[] = ['brand', 'rose', 'listen', 'cards'];

/**
 * 02a · Очередь — the cards queue in the order the cards will come, with the student's two
 * levers: priority (the word moves up, right after the overdue ones) and "I know it" (the
 * word leaves the queue as learned). Stage 1–2 rows show the translation, never the word:
 * the word is the answer of that card.
 */
export function QueueScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const invalidate = useInvalidateWords();
  const t = useT(queueDict);
  const queue = useQuery({ queryKey: ['cards', 'queue'], queryFn: () => api.cards.queue() });
  const [known, setKnown] = useState<Set<string>>(new Set());

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['cards'] });
    invalidate();
  };
  const priority = useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: WordPriority }) =>
      api.words.priority(id, priority),
    onSuccess: () => {
      haptic('light');
      refresh();
    },
  });
  const learned = useMutation({
    mutationFn: (id: string) => api.words.patch(id, { status: 'LEARNED' }),
    onSuccess: (w) => {
      haptic('success');
      setKnown((s) => new Set(s).add(w.id));
      refresh();
    },
  });
  const busy = priority.isPending || learned.isPending;

  const row = (w: CardQueueEntry, k: number) => {
    const gone = known.has(w.id);
    const prio = w.priority === 'HIGH';
    return (
      <div key={w.id} className="tr tr-cell tr-cell-static" style={{ alignItems: 'flex-start' }}>
        <LetterTile letter={w.label[0]?.toUpperCase() ?? '·'} tone={TONES[k % TONES.length]} />
        <span className="tr-cell-text" style={{ minWidth: 0 }}>
          <span
            className="tr-cell-title"
            style={{ textDecoration: gone ? 'line-through' : undefined }}
          >
            {w.label}
          </span>
          <span className="tr-cell-sub">
            {t('stage', { stage: w.stage, label: stageLabel(w.stage) })}
          </span>
          {!gone ? (
            <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <Chip
                selected={prio}
                disabled={busy}
                onClick={() => priority.mutate({ id: w.id, priority: prio ? 'NORMAL' : 'HIGH' })}
              >
                {t('prioritize')}
              </Chip>
              <Chip disabled={busy} onClick={() => learned.mutate(w.id)}>
                {t('known')}
              </Chip>
            </span>
          ) : null}
        </span>
        <Badge tone={gone ? 'good' : w.reason === 'OVERDUE' ? 'cards' : prio ? 'brand' : 'neutral'}>
          {gone
            ? t('knownDone')
            : w.reason === 'OVERDUE'
              ? t('overdue')
              : prio
                ? t('priority')
                : t('due')}
        </Badge>
      </div>
    );
  };

  const list = queue.data ?? [];
  return (
    <Screen
      back="/cards"
      head={
        <>
          <h1 className="tr-h1">{t('title')}</h1>
          <span className="tr-muted">{t('subtitle')}</span>
        </>
      }
    >
      <Callout tone="info">{t('intro')}</Callout>
      {queue.isLoading ? <Loading /> : null}
      {queue.error ? <ErrorBox error={queue.error} retry={() => queue.refetch()} /> : null}
      {priority.error ? <ErrorBox error={priority.error} /> : null}
      {learned.error ? <ErrorBox error={learned.error} /> : null}
      {queue.data && list.length === 0 ? <Callout tone="info">{t('empty')}</Callout> : null}
      {list.length > 0 ? (
        <ListGroup header={t('sectionToday', { words: words(list.length) })} footer={t('footer')}>
          {list.map(row)}
        </ListGroup>
      ) : null}
    </Screen>
  );
}
