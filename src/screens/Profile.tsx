import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { keys, useCalendar, useProfile, useSummary } from '../app/hooks';
import { ErrorBox, Loading, Screen } from '../app/Shell';
import { openDashboard, useApi, useSession } from '../app/session';
import { type Lang, LANGS, setLang, useLang } from '../i18n/lang';
import { profileDict } from '../i18n/screens/profile';
import { useT } from '../i18n/t';
import { fmtLong, fmtWeek } from '../lib/dates';
import { levelLabel } from '../lib/labels';
import { haptic } from '../telegram/webapp';
import {
  Avatar,
  Button,
  Card,
  Cell,
  Chip,
  DayCell,
  ListGroup,
  NormCell,
  TextField,
} from '../ui/components';

const LANG_NAME: Record<Lang, string> = { ru: 'Русский', en: 'English' };

/** 09 · Профиль */
export function ProfileScreen() {
  const api = useApi();
  const { state, demo } = useSession();
  const roles = state.kind === 'ready' ? state.roles : [];
  const staff = roles.includes('OWNER') || roles.includes('TEACHER');
  const qc = useQueryClient();
  const profile = useProfile();
  const summary = useSummary();
  const calendar = useCalendar(6);
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);
  const t = useT(profileDict);
  const lang = useLang();
  const dayNames = t('dayNames').split(',');

  useEffect(() => {
    if (profile.data) setDraft(profile.data.displayName);
  }, [profile.data]);

  const rename = useMutation({
    mutationFn: () => {
      const [first, ...rest] = draft.trim().split(/\s+/);
      return api.me.rename(first ?? '', rest.join(' '));
    },
    onSuccess: (p) => {
      qc.setQueryData(keys.profile, p);
      setSaved(true);
      haptic('success');
    },
    onError: () => haptic('error'),
  });

  const calm = useMutation({
    mutationFn: (on: boolean) => api.me.calmMode(on),
    onSuccess: (p) => {
      qc.setQueryData(keys.profile, p);
      haptic('light');
    },
  });

  // The switch applies at once; the backend remembers it for the bot's reminders.
  const language = useMutation({
    mutationFn: (next: Lang) => {
      setLang(next);
      return api.me.setLanguage(next);
    },
    onSuccess: (p) => qc.setQueryData(keys.profile, p),
  });

  const p = profile.data;
  const dirty = !!p && draft.trim() !== p.displayName;

  return (
    <Screen back="/">
      {p ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar name={p.displayName} size="lg" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <h1 className="tr-h1-sm">{p.displayName}</h1>
            <span className="tr-muted">
              {p.username ? `@${p.username}` : t('noUsername')}
              {p.registeredAt ? ` · ${t('since', { date: fmtLong(p.registeredAt) })}` : ''}
            </span>
          </div>
        </div>
      ) : (
        <Loading />
      )}

      <ListGroup header={t('dataHeader')} footer={t('dataFooter')}>
        <div className="tr tr-cell tr-cell-static tr-field-row">
          <TextField
            label={t('fullName')}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setSaved(false);
            }}
          />
          <Button
            variant={saved ? 'good' : 'dark'}
            size="md"
            disabled={!dirty || rename.isPending}
            onClick={() => rename.mutate()}
          >
            {saved && !dirty ? t('saved') : t('save')}
          </Button>
        </div>
        {rename.error ? (
          <div style={{ padding: '0 16px 12px' }}>
            <ErrorBox error={rename.error} />
          </div>
        ) : null}
        <Cell title={t('group')} date={p?.groups.map((g) => g.title).join(', ') || '—'} />
        <Cell title={t('level')} subtitle={t('levelSub')} date={levelLabel(p?.level ?? null)} />
        <Cell
          title={t('wordsLearned')}
          date={
            summary.data
              ? t('learnedOf', { learned: summary.data.learned, total: summary.data.total })
              : '…'
          }
        />
        <div className="tr tr-cell tr-cell-static" style={{ justifyContent: 'space-between' }}>
          <span className="tr-cell-text">
            <span className="tr-cell-title">{t('language')}</span>
            <span className="tr-cell-sub">{t('languageSub')}</span>
          </span>
          <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {LANGS.map((l) => (
              <Chip
                key={l}
                selected={lang === l}
                disabled={language.isPending}
                onClick={() => (l === lang ? undefined : language.mutate(l))}
              >
                {LANG_NAME[l]}
              </Chip>
            ))}
          </span>
        </div>
        {staff ? (
          <Cell
            tileIcon="grid"
            tileTone="brand"
            title={t('dashboard')}
            subtitle={t('dashboardSub')}
            chevron
            onClick={() => openDashboard(roles, demo)}
          />
        ) : null}
      </ListGroup>

      <Card title={t('weeksTitle')} meta={t('weeksMeta')}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '64px 44px 44px minmax(0, 1fr)',
            gap: '6px 8px',
            fontSize: 11,
            color: 'var(--ink-2)',
          }}
        >
          <span />
          <span style={{ textAlign: 'center' }}>{t('reading')}</span>
          <span style={{ textAlign: 'center' }}>{t('listeningShort')}</span>
          <span>{t('normByDay')}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(calendar.data ?? []).map((wk) => {
            const total = wk.reading.done + wk.listening.done;
            return (
              <div
                key={wk.weekStart}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '64px 44px 44px minmax(0, 1fr)',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{fmtWeek(wk.weekStart)}</span>
                <NormCell value={wk.reading.done} max={wk.reading.norm} />
                <NormCell value={wk.listening.done} max={wk.listening.norm} />
                <span
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                    gap: 3,
                  }}
                >
                  {dayNames.map((d, i) => (
                    // The API counts per week, not per day: light up as many days as there were reports.
                    <DayCell
                      key={d}
                      level={i < total ? (i % 2 === 0 ? 2 : 1) : 0}
                      title={`${d}: ${i < total ? t('report') : t('noReport')}`}
                    />
                  ))}
                </span>
              </div>
            );
          })}
          {calendar.isLoading ? <Loading /> : null}
        </div>
        <div className="tr-legend">
          <span>
            <i style={{ background: 'var(--good-wash)' }} />
            {t('legendDone')}
          </span>
          <span>
            <i style={{ background: 'var(--warn-wash)' }} />
            {t('legendPart')}
          </span>
          <span>
            <i style={{ background: 'var(--bad-wash)' }} />
            {t('legendMissed')}
          </span>
        </div>
      </Card>

      <ListGroup header={t('remindersHeader')} footer={t('remindersFooter')}>
        <Cell
          tileIcon="bell"
          tileTone="brand"
          title={t('calmTitle')}
          subtitle={
            p?.calmMode && p.calmUntil ? t('calmOn', { date: fmtLong(p.calmUntil) }) : t('calmOff')
          }
          onClick={() => calm.mutate(!p?.calmMode)}
          disabled={calm.isPending || !p}
          badge={p?.calmMode ? t('on') : t('off')}
          badgeTone={p?.calmMode ? 'good' : 'neutral'}
        />
      </ListGroup>
    </Screen>
  );
}
