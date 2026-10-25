import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { Cefr, Word, WordsQuery } from '../api/types';
import { downloadText, useRecommendations, useSummary, useWords } from '../app/hooks';
import { ErrorBox, Loading, Screen } from '../app/Shell';
import { useApi } from '../app/session';
import { dictionaryDict } from '../i18n/screens/dictionary';
import { tr, useT } from '../i18n/t';
import { words as wordsLabel } from '../lib/dates';
import {
  Button,
  Card,
  Cell,
  Chip,
  Icon,
  IconButton,
  ListGroup,
  SearchField,
  type Tone,
} from '../ui/components';

type Filter = 'all' | 'learning' | 'priority' | 'learned';
const TONES: Tone[] = ['brand', 'listen', 'cards', 'rose'];
const CEFR: Array<Cefr | ''> = ['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function toQuery(f: Filter, q: string, cefr: Cefr | ''): WordsQuery {
  const base: WordsQuery = { limit: 100, q: q.trim() || undefined, cefr: cefr || undefined };
  if (f === 'learning') return { ...base, status: 'LEARNING' };
  if (f === 'learned') return { ...base, status: 'LEARNED' };
  if (f === 'priority') return { ...base, priority: 'HIGH' };
  return base;
}

function sub(w: Word): string {
  const t = w.translation ?? tr(dictionaryDict, 'translationPending');
  if (w.priority === 'HIGH' && w.status !== 'LEARNED')
    return [
      t,
      tr(dictionaryDict, 'priority'),
      w.source === 'TEACHER' ? tr(dictionaryDict, 'fromTeacher') : null,
    ]
      .filter(Boolean)
      .join(' · ');
  return t;
}

/** 03 · Словарь */
export function DictionaryScreen() {
  const api = useApi();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [cefr, setCefr] = useState<Cefr | ''>('');
  const query = useMemo(() => toQuery(filter, q, cefr), [filter, q, cefr]);
  const words = useWords(query);
  const summary = useSummary();
  const recs = useRecommendations();
  const t = useT(dictionaryDict);

  const exportCsv = useMutation({
    mutationFn: () => api.words.exportText('csv'),
    onSuccess: (f) => downloadText(f.filename, f.content),
  });

  const s = summary.data;
  const teacher = recs.data?.[0];
  const missing = recs.data?.reduce((n, r) => n + r.items.length, 0) ?? 0;
  const items = words.data ?? [];
  const header =
    filter === 'learned'
      ? t('headerLearned', { n: s?.learned ?? '' })
      : filter === 'learning'
        ? t('headerLearning', { n: s?.learning ?? '' })
        : filter === 'priority'
          ? t('headerPriority', { n: s?.priority ?? '' })
          : t('headerAll', { n: s?.total ?? '' });
  const filters: Array<[Filter, string]> = [
    ['all', t('filterAll')],
    ['learning', t('filterLearning')],
    ['priority', t('filterPriority')],
    ['learned', t('filterLearned')],
  ];

  return (
    <Screen
      tab="dict"
      head={
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="tr-h1" style={{ flexGrow: 1 }}>
              {t('title')}{' '}
              {s ? (
                <span
                  style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-2)', letterSpacing: 0 }}
                >
                  · {wordsLabel(s.total)}
                </span>
              ) : null}
            </h1>
            <IconButton
              icon="download"
              label={t('exportCsv')}
              onClick={() => exportCsv.mutate()}
              loading={exportCsv.isPending}
            />
          </div>
          <SearchField
            placeholder={t('searchPlaceholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="tr-chips">
            {filters.map(([k, label]) => (
              <Chip key={k} selected={filter === k} onClick={() => setFilter(k)}>
                {label}
              </Chip>
            ))}
            <Chip
              icon="chevron-down"
              selected={cefr !== ''}
              onClick={() => setCefr(CEFR[(CEFR.indexOf(cefr) + 1) % CEFR.length])}
            >
              {t('cefr', { level: cefr || t('cefrAll') })}
            </Chip>
          </div>
        </>
      }
    >
      {teacher && filter === 'all' && !q ? (
        <Card
          tone="wash-brand"
          title={t('teacherTitle')}
          meta={`${teacher.list.title} · ${wordsLabel(missing)}`}
          to="/words/teacher"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="tr-muted" style={{ flexGrow: 1, color: 'var(--on-brand-wash)' }}>
              {t('teacherText', { missing })}
            </span>
            <Icon name="chevron-right" label={t('openList')} />
          </div>
        </Card>
      ) : null}
      <Button variant="tonal" size="md" block icon="plus" to="/words/add">
        {t('addWords')}
      </Button>
      <ListGroup>
        <Cell
          to="/cards/queue"
          tileIcon="cards"
          tileTone="brand"
          title={t('queue')}
          subtitle={t('queueSub')}
          chevron
        />
      </ListGroup>

      {words.error ? <ErrorBox error={words.error} retry={() => words.refetch()} /> : null}
      {exportCsv.error ? <ErrorBox error={exportCsv.error} /> : null}

      <ListGroup
        header={header}
        footer={
          words.data
            ? s
              ? t('shownOf', { n: items.length, total: s.total })
              : t('shown', { n: items.length })
            : undefined
        }
      >
        {words.isLoading ? <Loading /> : null}
        {items.map((w, i) => (
          <Cell
            key={w.id}
            to={`/words/${w.id}`}
            tile={w.word[0]}
            tileTone={TONES[i % 4]}
            title={w.word}
            subtitle={sub(w)}
            badge={w.status === 'LEARNED' ? t('learned') : (w.cefr ?? undefined)}
            badgeTone={w.status === 'LEARNED' ? 'good' : 'brand'}
          />
        ))}
        {words.data && items.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: 'var(--ink-2)',
              fontSize: 14,
            }}
          >
            {t('nothingFound')}
          </div>
        ) : null}
      </ListGroup>
    </Screen>
  );
}
