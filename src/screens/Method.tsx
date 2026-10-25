import { useProfile } from '../app/hooks';
import { Loading, Screen } from '../app/Shell';
import { methodDict } from '../i18n/screens/method';
import { useT } from '../i18n/t';
import { levelLabel, methodExample, methodLabel, methodSteps } from '../lib/labels';
import { Button, Card, Cell, ListGroup, SegmentedControl } from '../ui/components';

/** 08 · Как слушать — the listening method for the student's level, 6 steps + sample report. */
export function MethodScreen() {
  const profile = useProfile();
  const t = useT(methodDict);
  const p = profile.data;
  const method = p?.listeningMethod ?? 'PODCAST_NO_TRANSCRIPT';
  return (
    <Screen
      tab="reports"
      head={
        <>
          <h1 className="tr-h1">{t('title')}</h1>
          <SegmentedControl
            value="method"
            options={[
              { value: 'history', label: t('history'), to: '/reports' },
              { value: 'method', label: t('howToListen'), to: '/reports/method' },
            ]}
            label={t('section')}
          />
        </>
      }
    >
      {!p ? <Loading /> : null}
      <Card title={methodLabel(method)} meta={levelLabel(p?.level ?? null)}>
        <span className="tr-muted">
          {t('levelFromGroup')} {p?.retellingRequired ? t('retellRequired') : t('honestPct')}
        </span>
      </Card>

      <ListGroup header={t('sixSteps')}>
        {methodSteps(method).map((s, i) => (
          <Cell
            key={i}
            tile={String(i + 1)}
            tileTone={i === 5 ? 'listen' : 'brand'}
            title={s.title}
            subtitle={s.subtitle}
          />
        ))}
      </ListGroup>

      <Card title={t('example')} meta={t('freeFormat')}>
        <pre className="tr-pre">{methodExample(method)}</pre>
      </Card>

      <Button variant="primary" size="lg" block icon="edit" to="/reports/new?type=LISTENING">
        {t('submitListening')}
      </Button>
    </Screen>
  );
}
