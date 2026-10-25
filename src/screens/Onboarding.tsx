import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, ERR } from '../api/types';
import { useProfile } from '../app/hooks';
import { ErrorBox, Screen } from '../app/Shell';
import { useApi, useSession } from '../app/session';
import { onboardingDict } from '../i18n/screens/onboarding';
import { useT } from '../i18n/t';
import { levelLabel, methodShort } from '../lib/labels';
import { haptic } from '../telegram/webapp';
import { Callout, Card, Cell, ListGroup, MainButton, TextField } from '../ui/components';

const NAME_RE = /^[\p{L}][\p{L}'’-]{1,}$/u;
const valid = (s: string) => NAME_RE.test(s.trim());

/** 00 · Первый вход — the group member says their real first and last name. */
export function OnboardingScreen() {
  const api = useApi();
  const { activate } = useSession();
  const navigate = useNavigate();
  const profile = useProfile();
  const t = useT(onboardingDict);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [touched, setTouched] = useState(false);

  const ok = valid(first) && valid(last);
  const invalid = touched && (first.trim().length > 1 || last.trim().length > 1) && !ok;

  const register = useMutation({
    mutationFn: () => api.me.register(first.trim(), last.trim()),
    onSuccess: () => {
      haptic('success');
      activate();
      navigate('/', { replace: true });
    },
    onError: () => haptic('error'),
  });

  const group = profile.data?.groups[0];
  const nameInvalidFromServer =
    register.error instanceof ApiError && register.error.errorCode === ERR.NAME_INVALID;

  return (
    <Screen
      bottom={
        <MainButton
          icon="check"
          disabled={!ok}
          loading={register.isPending}
          onClick={() => register.mutate()}
        >
          {register.isPending ? t('saving') : t('start')}
        </MainButton>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="tr-eyebrow tr-eyebrow-brand">{t('eyebrow')}</span>
        <h1 className="tr-h1">{t('hello')}</h1>
        <span className="tr-body" style={{ color: 'var(--ink-2)' }}>
          {t('intro')}
        </span>
      </div>

      <ListGroup header={t('yourGroup')}>
        <Cell
          tileIcon="users"
          tileTone="brand"
          title={group?.title ?? profile.data?.groups.map((g) => g.title).join(', ') ?? t('group')}
          subtitle={
            profile.data
              ? `${levelLabel(profile.data.level)} · ${methodShort(profile.data.listeningMethod)}`
              : '…'
          }
        />
      </ListGroup>

      <Card title={t('nameCard')} meta={t('nameMeta')}>
        <TextField
          label={t('firstName')}
          value={first}
          onChange={(e) => {
            setFirst(e.target.value);
            setTouched(true);
          }}
          placeholder={t('firstPlaceholder')}
          autoComplete="given-name"
          autoCapitalize="words"
        />
        <TextField
          label={t('lastName')}
          value={last}
          onChange={(e) => {
            setLast(e.target.value);
            setTouched(true);
          }}
          placeholder={t('lastPlaceholder')}
          autoComplete="family-name"
          autoCapitalize="words"
          hint={ok ? t('hintOk', { name: `${first.trim()} ${last.trim()}` }) : t('hintDefault')}
        />
        {invalid || nameInvalidFromServer ? (
          <Callout tone="warn" icon="info">
            {t('invalid')}
          </Callout>
        ) : null}
        {register.error && !nameInvalidFromServer ? <ErrorBox error={register.error} /> : null}
      </Card>

      <ListGroup header={t('howHeader')} footer={t('howFooter')}>
        <Cell
          tileIcon="book"
          tileTone="brand"
          tileSize="sm"
          title={t('readingTitle')}
          subtitle={t('readingSub')}
        />
        <Cell
          tileIcon="headphones"
          tileTone="listen"
          tileSize="sm"
          title={t('listeningTitle')}
          subtitle={t('listeningSub')}
        />
        <Cell
          tileIcon="cards"
          tileTone="cards"
          tileSize="sm"
          title={t('cardsTitle')}
          subtitle={t('cardsSub')}
        />
      </ListGroup>
    </Screen>
  );
}
