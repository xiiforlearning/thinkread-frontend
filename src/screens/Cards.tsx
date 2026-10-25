import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { CardAnswer, CardView } from '../api/types';
import { keys } from '../app/hooks';
import { ErrorBox, Loading, Screen } from '../app/Shell';
import { useApi } from '../app/session';
import { cardsDict } from '../i18n/screens/cards';
import { useT } from '../i18n/t';
import { words } from '../lib/dates';
import { stageLabel } from '../lib/labels';
import { haptic } from '../telegram/webapp';
import {
  Badge,
  Button,
  Callout,
  Card,
  Cell,
  LetterTile,
  ListGroup,
  TextField,
} from '../ui/components';

type Phase =
  | { kind: 'idle' }
  | { kind: 'card'; card: CardView }
  | { kind: 'result'; card: CardView; result: CardAnswer }
  | { kind: 'finished'; extra: boolean }
  | { kind: 'empty' };

/**
 * 02 · Карточки — one card at a time, no session. Stage 1: translation →
 * word; stage 2: gap in a sentence; stage 3: own sentence checked by AI.
 * After `norm` answered cards the day is done; "Ещё 5 слов" starts an extra
 * series that moves words along but is not part of the norm.
 */
export function CardsScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const state = useQuery({ queryKey: ['cards', 'state'], queryFn: () => api.cards.state() });
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [answer, setAnswer] = useState('');
  const [extra, setExtra] = useState(false);
  const [extraDone, setExtraDone] = useState(0);
  const t = useT(cardsDict);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['cards'] });
    void qc.invalidateQueries({ queryKey: keys.progress });
    void qc.invalidateQueries({ queryKey: ['words'] });
  };

  const next = useMutation({
    mutationFn: () => api.cards.next(),
    onSuccess: ({ card, today }) => {
      setAnswer('');
      if (card) setPhase({ kind: 'card', card });
      else setPhase(today.done > 0 || extra ? { kind: 'finished', extra } : { kind: 'empty' });
    },
  });
  const grade = useMutation({
    mutationFn: (v: { card: CardView; answer: string | null }) =>
      v.answer === null
        ? api.cards.giveUp(v.card.attemptId)
        : api.cards.answer(v.card.attemptId, v.answer),
    onSuccess: (result, v) => {
      haptic(result.correct ? 'success' : 'error');
      if (extra) setExtraDone((n) => n + 1);
      setPhase({ kind: 'result', card: v.card, result });
      invalidate();
    },
  });
  const skip = useMutation({
    mutationFn: (card: CardView) => api.cards.skip(card.attemptId),
    onSuccess: () => {
      invalidate();
      next.mutate();
    },
  });

  // First card: resume the open one or take the queue head once the state is known.
  useEffect(() => {
    if (phase.kind !== 'idle' || !state.data) return;
    const today = state.data.today;
    if (state.data.current) setPhase({ kind: 'card', card: state.data.current });
    else if (today.done >= today.norm) setPhase({ kind: 'finished', extra: false });
    else if (state.data.queue.due === 0) setPhase({ kind: 'empty' });
    else next.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.data, phase.kind]);

  const today = (phase.kind === 'result'
    ? phase.result.today
    : phase.kind === 'card'
      ? phase.card.today
      : state.data?.today) ?? {
    done: 0,
    correct: 0,
    norm: 5,
  };
  const counterDone = extra ? extraDone : Math.min(today.done, today.norm);
  const busy = next.isPending || grade.isPending || skip.isPending;
  const error = next.error ?? grade.error ?? skip.error ?? state.error;

  const advance = () => {
    if (!extra && today.done >= today.norm) setPhase({ kind: 'finished', extra: false });
    else if (extra && extraDone >= today.norm) setPhase({ kind: 'finished', extra: true });
    else next.mutate();
  };
  const startExtra = () => {
    setExtra(true);
    setExtraDone(0);
    next.mutate();
  };

  const card = phase.kind === 'card' ? phase.card : phase.kind === 'result' ? phase.card : null;
  const result = phase.kind === 'result' ? phase.result : null;
  const stage = card?.stage ?? 1;

  return (
    <Screen tab="cards">
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <h1 className="tr-h1">{t('title')}</h1>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span
            style={{
              fontSize: 13,
              color: extra ? 'var(--brand)' : 'var(--ink-2)',
              fontWeight: 500,
            }}
          >
            {extra
              ? t('extraCounter', { done: extraDone, norm: today.norm })
              : t('todayCounter', { done: counterDone, norm: today.norm })}
          </span>
          <div style={{ display: 'flex', gap: 5 }} aria-hidden="true">
            {Array.from({ length: today.norm }, (_, k) => (
              <span
                key={k}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background:
                    k < counterDone
                      ? extra
                        ? 'var(--brand)'
                        : 'var(--cards)'
                      : 'var(--line-strong)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {extra ? (
        <Callout tone="brand" icon="cards">
          {t('extraCallout')}
        </Callout>
      ) : null}
      {error ? <ErrorBox error={error} retry={() => next.mutate()} /> : null}
      {phase.kind === 'idle' ? <Loading /> : null}

      {phase.kind === 'empty' ? (
        <Card>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              textAlign: 'center',
              padding: '12px 0 4px',
            }}
          >
            <LetterTile icon="check" size="md" tone="good" />
            <h2 className="tr-h1-sm">{t('emptyTitle')}</h2>
            <p className="tr-muted" style={{ margin: 0, fontSize: 14, lineHeight: '20px' }}>
              {t('emptyText')}
            </p>
          </div>
          <Button variant="primary" size="lg" block icon="plus" to="/words/add">
            {t('addWords')}
          </Button>
        </Card>
      ) : null}

      {phase.kind === 'finished' ? (
        <Card>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              textAlign: 'center',
              padding: '12px 0 4px',
            }}
          >
            <LetterTile icon="check" size="md" tone="good" />
            <h2 className="tr-h1-sm">
              {phase.extra ? t('finishedExtraTitle') : t('finishedTitle')}
            </h2>
            <p className="tr-muted" style={{ margin: 0, fontSize: 14, lineHeight: '20px' }}>
              {phase.extra
                ? t('finishedExtra')
                : t('finishedNorm', {
                    norm: today.norm,
                    total: today.norm,
                    correct: today.correct,
                  })}{' '}
              {(state.data?.queue.due ?? 0) > 0 ? t('moreAvailable') : t('noMore')}
            </p>
          </div>
          {(state.data?.queue.due ?? 0) > 0 ? (
            <Button
              variant="primary"
              size="lg"
              block
              icon="cards"
              onClick={startExtra}
              disabled={busy}
            >
              {t('moreWords', { words: words(today.norm) })}
            </Button>
          ) : null}
          <Button variant="ghost" size="md" block to="/">
            {t('enoughToday')}
          </Button>
        </Card>
      ) : null}

      {card ? (
        <>
          <Card>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 4px 0' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge tone="brand">{t('stageBadge', { stage, label: stageLabel(stage) })}</Badge>
                <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  {stage === 1 ? t('stage1Hint') : stage === 2 ? t('stage2Hint') : t('stage3Hint')}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 17, lineHeight: '24px', color: 'var(--ink-2)' }}>
                  {card.question}
                </div>
                {card.shown ? <div className="tr-word-title">{card.shown}</div> : null}
                {card.hint ? (
                  <div style={{ fontSize: 15, color: 'var(--ink-2)' }}>{card.hint}</div>
                ) : null}
              </div>

              {phase.kind === 'card' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <TextField
                    label={t('yourAnswer')}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={card.placeholder}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    autoCapitalize={stage === 3 ? 'sentences' : 'none'}
                    disabled={busy}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && answer.trim() && !busy)
                        grade.mutate({ card, answer: answer.trim() });
                    }}
                  />
                  {grade.isPending && stage === 3 ? (
                    <Callout tone="info" icon="spinner">
                      {t('checking')}
                    </Callout>
                  ) : null}
                  <Button
                    variant="primary"
                    size="lg"
                    block
                    disabled={!answer.trim() || busy}
                    onClick={() => grade.mutate({ card, answer: answer.trim() })}
                  >
                    {t('check')}
                  </Button>
                  {card.canGiveUp ? (
                    <Button
                      variant="ghost"
                      size="md"
                      block
                      disabled={busy}
                      onClick={() => grade.mutate({ card, answer: null })}
                    >
                      {t('giveUp')}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {result ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Callout
                    tone={result.correct ? 'good' : 'info'}
                    icon={result.correct ? 'check' : 'info'}
                  >
                    {result.message}
                  </Callout>
                  {result.feedback ? (
                    <Callout tone="info" title={result.correct ? t('grammarAside') : undefined}>
                      {result.feedback}
                    </Callout>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Card>

          <div style={{ display: 'flex', gap: 12 }}>
            {phase.kind === 'card' ? (
              <Button
                variant="secondary"
                size="md"
                block
                style={{ flex: '1 1 0' }}
                disabled={busy}
                onClick={() => skip.mutate(card)}
              >
                {t('skip')}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                block
                iconRight="chevron-right"
                style={{ flex: '1 1 0' }}
                disabled={busy}
                onClick={advance}
              >
                {t('next')}
              </Button>
            )}
          </div>
        </>
      ) : null}

      {state.data && state.data.queue.due > 0 ? (
        <ListGroup header={t('queueHeader')} footer={t('queueFooter')}>
          <Cell
            to="/cards/queue"
            tileIcon="list"
            tileTone="brand"
            title={t('queueCell', { words: words(state.data.queue.due) })}
            subtitle={[
              state.data.queue.overdue > 0
                ? t('queueOverdue', { n: state.data.queue.overdue })
                : null,
              state.data.queue.priority > 0
                ? t('queuePriority', { n: state.data.queue.priority })
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            chevron
          />
        </ListGroup>
      ) : null}
    </Screen>
  );
}
