import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { keys, useProfile, useProgress, useRecommendations, useSpotCheck } from '../app/hooks';
import { ErrorBox, Loading, Screen } from '../app/Shell';
import { useApi } from '../app/session';
import { mainDict } from '../i18n/screens/main';
import { type Params, useT } from '../i18n/t';
import { daysLeftInWeek, days, fmtToday, fmtWeek, words } from '../lib/dates';
import { levelLabel, methodShort } from '../lib/labels';
import { haptic } from '../telegram/webapp';
import {
  Avatar,
  Button,
  Callout,
  Card,
  Cell,
  ListGroup,
  ProgressRing,
  TextField,
} from '../ui/components';
import { Link } from 'react-router-dom';

type T = (key: keyof typeof mainDict.ru, params?: Params) => string;

function weekHint(t: T, reading: number, listening: number, method: string): string {
  if (reading >= 3 && listening >= 3) return t('hintDone');
  if (listening === 0 && reading > 0)
    return method === 'SERIES' ? t('hintListenEpisode') : t('hintListenPodcast');
  if (reading === 0 && listening > 0) return t('hintRead');
  if (reading === 0 && listening === 0) return t('hintStart');
  return t('hintLeft', {
    reading: 3 - Math.min(reading, 3),
    listening: 3 - Math.min(listening, 3),
  });
}

/** 01 · Главная */
export function MainScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const profile = useProfile();
  const progress = useProgress();
  const recs = useRecommendations();
  const spot = useSpotCheck();
  const [spotAnswer, setSpotAnswer] = useState('');
  const [spotDone, setSpotDone] = useState(false);
  const t = useT(mainDict);

  const answer = useMutation({
    mutationFn: (text: string | null) => api.me.answerSpotCheck(text),
    onSuccess: () => {
      haptic('success');
      setSpotDone(true);
      qc.setQueryData(keys.spotCheck, null);
    },
  });

  const p = profile.data;
  const week = progress.data?.week;
  const cards = progress.data?.cards;
  const wordsStat = progress.data?.words;
  const teacher = recs.data?.[0];
  const missing = recs.data?.reduce((n, r) => n + r.items.length, 0) ?? 0;
  const normDone = !!cards?.available && cards.done >= cards.norm;

  return (
    <Screen tab="home">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="tr-eyebrow tr-eyebrow-brand">{fmtToday()}</span>
          <h1 className="tr-h1">
            {t('hello')}
            {p?.firstName ? `, ${p.firstName}` : ''}
          </h1>
          <span className="tr-muted">
            {p
              ? `${p.groups.map((g) => g.title).join(', ') || t('noGroup')} · ${levelLabel(p.level)}`
              : ' '}
          </span>
        </div>
        <Link to="/profile" aria-label={t('profile')} style={{ display: 'flex' }}>
          <Avatar name={p?.displayName ?? '?'} size="md" />
        </Link>
      </div>

      {progress.error ? <ErrorBox error={progress.error} retry={() => progress.refetch()} /> : null}

      <Card
        title={t('thisWeek')}
        meta={
          week
            ? `${fmtWeek(week.weekStart)} · ${t('daysLeft', { days: days(daysLeftInWeek()) })}`
            : undefined
        }
      >
        {week ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-around', padding: '4px 0' }}>
              <ProgressRing
                value={week.reading.done}
                max={week.reading.norm}
                label={t('reading')}
              />
              <ProgressRing
                value={week.listening.done}
                max={week.listening.norm}
                label={t('listening')}
                tone="listen"
              />
              <ProgressRing
                value={cards?.done ?? 0}
                max={cards?.norm ?? 5}
                label={t('cards')}
                tone="cards"
              />
            </div>
            <Callout tone="info" icon="headphones">
              {weekHint(t, week.reading.done, week.listening.done, p?.listeningMethod ?? '')}
            </Callout>
          </>
        ) : (
          <Loading />
        )}
      </Card>

      {spot.data && !spotDone ? (
        <Card
          tone="wash-listen"
          title={t('spotTitle', { title: spot.data.sourceTitle ?? t('recentPodcast') })}
          meta={t('spotMeta')}
        >
          <span className="tr-body">{spot.data.question}</span>
          <div className="tr-field-row">
            <TextField
              label={t('spotLabel')}
              value={spotAnswer}
              onChange={(e) => setSpotAnswer(e.target.value)}
              placeholder={t('spotPlaceholder')}
            />
            <Button
              variant="primary"
              size="md"
              icon="send"
              disabled={!spotAnswer.trim() || answer.isPending}
              loading={answer.isPending && answer.variables !== null}
              onClick={() => answer.mutate(spotAnswer.trim())}
            >
              {t('answer')}
            </Button>
          </div>
          <div>
            <Button
              variant="ghost"
              size="sm"
              disabled={answer.isPending}
              loading={answer.isPending && answer.variables === null}
              onClick={() => answer.mutate(null)}
            >
              {t('dontRemember')}
            </Button>
          </div>
          {answer.error ? <ErrorBox error={answer.error} /> : null}
        </Card>
      ) : null}
      {spotDone ? (
        <Callout tone="good" icon="check">
          {t('spotThanks')}
        </Callout>
      ) : null}

      {normDone ? (
        <Card
          title={t('cardsDoneTitle')}
          meta={t('ofNorm', { done: cards?.done ?? 0, norm: cards?.norm ?? 0 })}
        >
          <span className="tr-muted">{t('cardsDoneText')}</span>
          <Button variant="tonal" size="md" block icon="cards" to="/cards">
            {t('repeatMore')}
          </Button>
        </Card>
      ) : (
        <Button variant="primary" size="lg" block icon="cards" to="/cards">
          {cards?.available
            ? t('repeatWords', { words: words(Math.max(cards.norm - cards.done, 1)) })
            : t('repeatAny')}
        </Button>
      )}

      <ListGroup header={t('actions')}>
        <Cell
          to="/reports/new"
          tileIcon="edit"
          tileTone="listen"
          title={t('submitReport')}
          subtitle={t('submitReportSub')}
          chevron
        />
        <Cell
          to="/words"
          tileIcon="book"
          tileTone="cards"
          title={t('dictionary')}
          subtitle={
            wordsStat
              ? `${words(wordsStat.total)} · ${t('learnedCount', { n: wordsStat.learned })}`
              : '…'
          }
          chevron
        />
        {teacher ? (
          <Cell
            to="/words/teacher"
            tileIcon="list"
            tileTone="brand"
            title={t('teacherWords')}
            subtitle={`${teacher.list.title} · ${t('missingWords', { words: words(missing) })}`}
            badge={t('newBadge')}
            badgeTone="brand"
            chevron
          />
        ) : null}
        <Cell
          to="/reports/method"
          tileIcon="headphones"
          tileTone="brand"
          title={t('howToListen')}
          subtitle={p ? t('methodSub', { method: methodShort(p.listeningMethod) }) : '…'}
          chevron
        />
      </ListGroup>
    </Screen>
  );
}
