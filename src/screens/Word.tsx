import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePatchWord, useWord, useWordPriority } from '../app/hooks';
import { ErrorBox, Loading, Screen } from '../app/Shell';
import { wordDict } from '../i18n/screens/word';
import { useT } from '../i18n/t';
import { fmtDay } from '../lib/dates';
import { sourceLabel } from '../lib/labels';
import { haptic } from '../telegram/webapp';
import {
  Badge,
  Button,
  Card,
  Cell,
  Chip,
  IconButton,
  ListGroup,
  MainButton,
  TextField,
} from '../ui/components';

const STAGE_NOTE = { 1: 'stageNote1', 2: 'stageNote2', 3: 'stageNote3' } as const;

/** 04 · Слово */
export function WordScreen() {
  const { id = '' } = useParams();
  const word = useWord(id);
  const patch = usePatchWord(id);
  const priority = useWordPriority(id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const t = useT(wordDict);

  const w = word.data;
  if (word.isLoading)
    return (
      <Screen back="/words">
        <Loading />
      </Screen>
    );
  if (!w)
    return (
      <Screen back="/words">
        <ErrorBox error={word.error ?? new Error(t('notFound'))} retry={() => word.refetch()} />
      </Screen>
    );

  const learned = w.status === 'LEARNED';
  const prio = w.priority === 'HIGH' && !learned;
  const source = sourceLabel(w.source);
  const sourceSub = `${fmtDay(w.createdAt)} · ${w.source === 'MANUAL' || w.source === 'IMPORT' || w.source === 'TEACHER' ? t('sourcePriority') : t('sourceQueue')}`;

  return (
    <Screen
      back="/words"
      bottom={
        learned ? (
          <div className="tr tr-mainbar">
            <Button
              variant="secondary"
              size="lg"
              block
              icon="refresh"
              loading={patch.isPending}
              onClick={() => patch.mutate({ status: 'LEARNING' })}
            >
              {t('backToLearning')}
            </Button>
          </div>
        ) : (
          <MainButton
            icon="check"
            loading={patch.isPending}
            onClick={() => {
              haptic('success');
              patch.mutate({ status: 'LEARNED' });
            }}
          >
            {t('markLearned')}
          </MainButton>
        )
      }
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <h1 className="tr-word-title">{w.word}</h1>
          {!editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 17, lineHeight: '24px', color: 'var(--ink-2)' }}>
                {w.translation ?? t('translationPending')}
              </span>
              <IconButton
                icon="edit"
                label={t('editTranslation')}
                size="sm"
                quiet
                onClick={() => {
                  setDraft(w.translation ?? '');
                  setEditing(true);
                }}
              />
            </div>
          ) : (
            <div className="tr-field-row">
              <TextField
                label={t('translation')}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
              />
              <Button
                variant="primary"
                size="md"
                loading={patch.isPending}
                onClick={() => {
                  const next = draft.trim();
                  if (next && next !== w.translation) patch.mutate({ translation: next });
                  setEditing(false);
                }}
              >
                {t('done')}
              </Button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <Badge tone={learned ? 'good' : 'brand'}>
            {learned ? t('learned') : (w.cefr ?? t('levelUnknown'))}
          </Badge>
          {prio ? <Badge tone="cards">{t('priority')}</Badge> : null}
        </div>
      </div>

      {patch.error ? <ErrorBox error={patch.error} /> : null}
      {priority.error ? <ErrorBox error={priority.error} /> : null}

      {!learned ? (
        <Card title={t('reviewTitle')} meta={prio ? t('priorityOn') : t('normalQueue')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="tr-muted" style={{ flexGrow: 1 }}>
              {t('priorityText')}
            </span>
            <Chip
              selected={prio}
              icon={prio ? 'check' : 'plus'}
              loading={priority.isPending}
              onClick={() => priority.mutate(prio ? 'NORMAL' : 'HIGH')}
            >
              {prio ? t('inPriority') : t('addPriority')}
            </Chip>
          </div>
        </Card>
      ) : null}

      <ListGroup header={t('source')}>
        <Cell
          tileIcon={
            w.source === 'MANUAL'
              ? 'plus'
              : w.source === 'TEACHER'
                ? 'list'
                : w.source === 'READING'
                  ? 'book'
                  : w.source === 'IMPORT'
                    ? 'upload'
                    : 'headphones'
          }
          tileTone="brand"
          title={source}
          subtitle={sourceSub}
        />
      </ListGroup>

      {w.example ? (
        <Card title={t('example')}>
          <p style={{ margin: 0, fontSize: 16, lineHeight: '24px' }}>{w.example}</p>
        </Card>
      ) : null}

      <Card
        title={t('stagesTitle')}
        meta={learned ? t('passed') : t('stageOf', { stage: w.stage })}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`tr-stage-bar${learned || s <= w.stage ? ' tr-stage-bar-on' : ''}`}
            />
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--ink-2)',
          }}
        >
          <span>{t('stageTranslation')}</span>
          <span>{t('stageSentence')}</span>
          <span>{t('stageOwn')}</span>
        </div>
        <span className="tr-muted">{learned ? t('learnedNote') : t(STAGE_NOTE[w.stage])}</span>
        {!learned ? (
          <div>
            <Button variant="tonal" size="sm" icon="cards" to="/cards">
              {t('practice')}
            </Button>
          </div>
        ) : null}
      </Card>

      <span className="tr-muted" style={{ fontSize: 12, lineHeight: '16px', textAlign: 'center' }}>
        {t('footer')}
      </span>
    </Screen>
  );
}
