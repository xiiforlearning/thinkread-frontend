import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { ImportPreview, Word } from '../api/types';
import { useInvalidateWords } from '../app/hooks';
import { ErrorBox, Screen } from '../app/Shell';
import { useApi } from '../app/session';
import { addWordsDict } from '../i18n/screens/addWords';
import { useT } from '../i18n/t';
import { words as wordsLabel } from '../lib/dates';
import { haptic } from '../telegram/webapp';
import { Button, Callout, Card, CheckRow, ListGroup, MainButton, TextArea } from '../ui/components';

type Step =
  | { kind: 'input' }
  | { kind: 'preview'; preview: ImportPreview; excluded: Set<string> }
  | { kind: 'done'; added: Word[] };

/**
 * 05 · Добавить слова — free text or a .txt/.csv file → preview with checkboxes
 * (duplicates greyed out) → confirm. Always goes through the import preview so
 * the student sees what will be added, whatever the size of the list.
 */
export function AddWordsScreen() {
  const api = useApi();
  const invalidate = useInvalidateWords();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [step, setStep] = useState<Step>({ kind: 'input' });
  const t = useT(addWordsDict);

  const parse = useMutation({
    mutationFn: (v: string) => api.words.importText(v),
    onSuccess: (preview) => {
      haptic('light');
      setStep({ kind: 'preview', preview, excluded: new Set() });
    },
    onError: () => haptic('error'),
  });
  const confirm = useMutation({
    mutationFn: (v: { id: string; exclude: string[] }) => api.words.confirmImport(v.id, v.exclude),
    onSuccess: (r) => {
      haptic('success');
      invalidate();
      setStep({ kind: 'done', added: r.words });
    },
    onError: () => haptic('error'),
  });
  const cancel = useMutation({ mutationFn: (id: string) => api.words.cancelImport(id) });

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const content = await f.text();
    setText(content);
  };

  const title =
    step.kind === 'input'
      ? t('titleInput')
      : step.kind === 'preview'
        ? t('titlePreview')
        : t('titleDone');
  const toAdd =
    step.kind === 'preview'
      ? step.preview.items.filter((i) => !i.duplicate && !step.excluded.has(i.word)).length
      : 0;

  const bottom =
    step.kind === 'input' ? (
      <MainButton disabled={!text.trim() || parse.isPending} onClick={() => parse.mutate(text)}>
        {parse.isPending ? t('parsing') : t('parse')}
      </MainButton>
    ) : step.kind === 'preview' ? (
      <MainButton
        icon="plus"
        disabled={toAdd === 0 || confirm.isPending}
        onClick={() => confirm.mutate({ id: step.preview.importId, exclude: [...step.excluded] })}
      >
        {confirm.isPending ? t('adding') : t('addN', { n: toAdd })}
      </MainButton>
    ) : (
      <MainButton icon="book" to="/words">
        {t('openDictionary')}
      </MainButton>
    );

  return (
    <Screen back="/words" bottom={bottom}>
      <h1 className="tr-h1-sm">{title}</h1>

      {step.kind === 'input' ? (
        <>
          {parse.error ? <ErrorBox error={parse.error} /> : null}
          <Card>
            <TextArea
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              label={t('listLabel')}
              rows={7}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('listPlaceholder')}
              hint={t('listHint')}
            />
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.csv,text/plain,text/csv"
              style={{ display: 'none' }}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <Button
              variant="secondary"
              size="md"
              block
              icon="upload"
              onClick={() => fileRef.current?.click()}
            >
              {t('orFile')}
            </Button>
          </Card>
        </>
      ) : null}

      {step.kind === 'preview' ? (
        <>
          <Callout tone="brand" title={t('found', { words: wordsLabel(step.preview.found) })}>
            {step.preview.duplicates ? `${t('duplicates', { n: step.preview.duplicates })} ` : ''}
            {t('uncheckExtra')}
          </Callout>
          {confirm.error ? <ErrorBox error={confirm.error} /> : null}
          <ListGroup header={t('newWords')}>
            {step.preview.items.map((it) => (
              <CheckRow
                key={it.word}
                checked={!it.duplicate && !step.excluded.has(it.word)}
                disabled={it.duplicate}
                onChange={(v) => {
                  const excluded = new Set(step.excluded);
                  if (v) excluded.delete(it.word);
                  else excluded.add(it.word);
                  setStep({ ...step, excluded });
                }}
                title={it.word}
                subtitle={it.translation ?? t('translationByAi')}
                badge={it.duplicate ? t('alreadyHave') : undefined}
                badgeTone="neutral"
              />
            ))}
          </ListGroup>
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              cancel.mutate(step.preview.importId);
              setStep({ kind: 'input' });
            }}
          >
            {t('cancel')}
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
    </Screen>
  );
}
