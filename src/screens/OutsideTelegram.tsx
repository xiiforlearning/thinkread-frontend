import { Screen } from '../app/Shell';
import { botUsername } from '../app/session';
import { common } from '../i18n/common';
import { outsideTelegramDict } from '../i18n/screens/outsideTelegram';
import { tr, useT } from '../i18n/t';
import { Button, Cell, LetterTile, ListGroup } from '../ui/components';

/** The site opened in a plain browser: the Mini App only works inside Telegram. */
export function OutsideTelegramScreen() {
  const t = useT(outsideTelegramDict);
  const bot = botUsername();
  const dashboard = `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}admin.html`;
  return (
    <Screen>
      <div className="tr-center">
        <LetterTile
          icon="phone"
          size="md"
          tone="brand"
          style={{ transform: 'scale(1.6)', margin: '16px 0' }}
        />
        <h1 className="tr-h1">{t('title')}</h1>
        <p className="tr-body" style={{ margin: 0, color: 'var(--ink-2)' }}>
          {t('body')}
        </p>
        {bot ? (
          <a href={`https://t.me/${bot}`} style={{ width: '100%' }}>
            <Button variant="primary" size="lg" block icon="send">
              {t('open')}
            </Button>
          </a>
        ) : null}
        <ListGroup className="tr-steps" style={{ width: '100%', textAlign: 'left' }}>
          <Cell tile="1" tileTone="brand" title={t('step1')} subtitle={t('step1Sub')} />
          <Cell
            tile="2"
            tileTone="brand"
            title={t('step2')}
            subtitle={bot ? t('step2SubBot', { bot }) : t('step2SubNoBot')}
          />
        </ListGroup>
        <span className="tr-muted" style={{ fontSize: 12, lineHeight: '16px' }}>
          {t('forStaff')}{' '}
          <a href={dashboard} style={{ color: 'var(--brand)' }}>
            {t('dashboard')}
          </a>
          . {t('tryWithoutLogin')}{' '}
          <a href="?demo=1" style={{ color: 'var(--brand)' }}>
            {tr(common, 'demo')}
          </a>
          .
        </span>
      </div>
    </Screen>
  );
}
