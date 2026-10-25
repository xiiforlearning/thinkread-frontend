import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { Word } from '../api/types';
import { useInvalidateWords, useProfile, useRecommendations } from '../app/hooks';
import { ErrorBox, Loading, Screen } from '../app/Shell';
import { useApi } from '../app/session';
import { teacherWordsDict } from '../i18n/screens/teacherWords';
import { useT } from '../i18n/t';
import { words as wordsLabel } from '../lib/dates';
import { haptic } from '../telegram/webapp';
import { Button, Callout, CheckRow, ListGroup, MainButton } from '../ui/components';

type Step = { kind: 'list' } | { kind: 'done'; added: Word[] } | { kind: 'hidden' };

/** 05b · Слова от учителя — recommended list words the student does not have yet. */
export function TeacherWordsScreen() {
  const api = useApi();
  const invalidate = useInvalidateWords();
  const recs = useRecommendations();
  const profile = useProfile();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<Step>({ kind: 'list' });
  const t = useT(teacherWordsDict);

  const rec = recs.data?.[0] ?? null;
  const items = rec?.items ?? [];

  useEffect(() => {
    if (rec && step.kind === 'list') setChecked(new Set(rec.items.map((i) => i.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec?.list.id]);

  const accept = useMutation({
    mutationFn: (ids: string[]) => api.me.acceptRecommendations(ids),
    onSuccess: (r) => {
      haptic('success');
      invalidate();
      setStep({ kind: 'done', added: r.added });
    },
    onError: () => haptic('error'),
  });
  const dismiss = useMutation({
    mutationFn: () => api.me.dismissRecommendations('all'),
    onSuccess: () => {
      invalidate();
      setStep({ kind: 'hidden' });
    },
  });

  const count = checked.size;
  const bottom =
    step.kind === 'list' && rec ? (
      <MainButton
        icon="plus"
        disabled={count === 0}
        loading={accept.isPending}
        onClick={() => accept.mutate([...checked])}
      >
        {accept.isPending ? t('adding') : t('addN', { n: count })}
      </MainButton>
    ) : (
      <MainButton icon="book" to="/words">
        {step.kind === 'hidden' ? t('toDictionary') : t('openDictionary')}
      </MainButton>
    );

  return (
    <Screen back="/words" bottom={bottom}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="tr-eyebrow tr-eyebrow-brand">{t('eyebrow')}</span>
        <h1 className="tr-h1-sm">{rec?.list.title ?? t('title')}</h1>
        <span className="tr-muted">
          {t('teacher')}
          {profile.data?.groups[0]
            ? ` · ${t('forGroup', { group: profile.data.groups[0].title })}`
            : ''}
          {rec ? ` · ${t('missingWords', { words: wordsLabel(items.length) })}` : ''}
        </span>
      </div>

      {recs.isLoading ? <Loading /> : null}
      {recs.error ? <ErrorBox error={recs.error} retry={() => recs.refetch()} /> : null}

      {step.kind === 'list' && recs.data && !rec ? (
        <Callout tone="info" icon="info" title={t('noNewTitle')}>
          {t('noNewText')}
        </Callout>
      ) : null}

      {step.kind === 'list' && rec ? (
        <>
          <Callout
            tone="brand"
            icon="list"
            title={t('missingWords', { words: wordsLabel(items.length) })}
          >
            {t('optionalText')}
          </Callout>
          {accept.error ? <ErrorBox error={accept.error} /> : null}
          <ListGroup header={t('notInDictionary', { n: items.length })} footer={t('listFooter')}>
            {items.map((it) => (
              <CheckRow
                key={it.id}
                checked={checked.has(it.id)}
                onChange={(v) => {
                  const next = new Set(checked);
                  if (v) next.add(it.id);
                  else next.delete(it.id);
                  setChecked(next);
                }}
                title={it.word}
                subtitle={it.translation ?? t('translationByAi')}
              />
            ))}
          </ListGroup>
          <Button
            variant="ghost"
            size="md"
            loading={dismiss.isPending}
            onClick={() => dismiss.mutate()}
          >
            {t('hideList')}
          </Button>
        </>
      ) : null}

      {step.kind === 'done' ? (
        <>
          <Callout
            tone="good"
            icon="check"
            title={t('addedTitle', { words: wordsLabel(step.added.length) })}
          >
            {t('addedText')}
          </Callout>
          <Button variant="secondary" size="md" block icon="cards" to="/cards">
            {t('reviewNow')}
          </Button>
        </>
      ) : null}

      {step.kind === 'hidden' ? (
        <Callout tone="info" icon="info" title={t('hiddenTitle')}>
          {t('hiddenText')}
        </Callout>
      ) : null}
    </Screen>
  );
}
