import { Screen } from '../app/Shell';
import { botUsername } from '../app/session';
import { Button, Cell, LetterTile, ListGroup } from '../ui/components';

/** The site opened in a plain browser: the Mini App only works inside Telegram. */
export function OutsideTelegramScreen() {
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
        <h1 className="tr-h1">ThinkRead живёт в Telegram</h1>
        <p className="tr-body" style={{ margin: 0, color: 'var(--ink-2)' }}>
          Отчёты, словарь и карточки открываются из бота школы: он узнаёт студента по аккаунту
          Telegram, в обычном браузере войти нельзя.
        </p>
        {bot ? (
          <a href={`https://t.me/${bot}`} style={{ width: '100%' }}>
            <Button variant="primary" size="lg" block icon="send">
              Открыть в Telegram
            </Button>
          </a>
        ) : null}
        <ListGroup className="tr-steps" style={{ width: '100%', textAlign: 'left' }}>
          <Cell
            tile="1"
            tileTone="brand"
            title="Вступите в группу"
            subtitle="Ссылку на группу даёт школа"
          />
          <Cell
            tile="2"
            tileTone="brand"
            title="Нажмите «Открыть ThinkRead»"
            subtitle={bot ? `Кнопка меню в чате с @${bot}` : 'Кнопка меню в чате с ботом'}
          />
        </ListGroup>
        <span className="tr-muted" style={{ fontSize: 12, lineHeight: '16px' }}>
          Учителю и владельцу —{' '}
          <a href={dashboard} style={{ color: 'var(--brand)' }}>
            дашборд
          </a>
          . Посмотреть интерфейс без входа:{' '}
          <a href="?demo=1" style={{ color: 'var(--brand)' }}>
            демо
          </a>
          .
        </span>
      </div>
    </Screen>
  );
}
