import { Screen } from '../app/Shell';
import { useSession } from '../app/session';
import { notRegisteredDict } from '../i18n/screens/notRegistered';
import { useT } from '../i18n/t';
import { Cell, LetterTile, ListGroup, MainButton } from '../ui/components';

/** 10 · Нет доступа — not in any of the school's Telegram groups (or archived). */
export function NotRegisteredScreen({ archived }: { archived: boolean }) {
  const { refresh, state } = useSession();
  const t = useT(notRegisteredDict);
  return (
    <Screen
      bottom={
        <MainButton icon="refresh" onClick={refresh} disabled={state.kind === 'loading'}>
          {t('checkAgain')}
        </MainButton>
      }
    >
      <div className="tr-center">
        <LetterTile
          icon="lock"
          size="md"
          tone="brand"
          style={{ transform: 'scale(1.6)', margin: '16px 0' }}
        />
        <h1 className="tr-h1">{archived ? t('closedTitle') : t('noAccessTitle')}</h1>
        <p className="tr-body" style={{ margin: 0, color: 'var(--ink-2)' }}>
          {archived ? t('archivedBody') : t('notMemberBody')}
        </p>
        {!archived ? (
          <ListGroup style={{ width: '100%', textAlign: 'left' }}>
            <Cell tile="1" tileTone="brand" title={t('step1')} subtitle={t('step1Sub')} />
            <Cell tile="2" tileTone="brand" title={t('step2')} subtitle={t('step2Sub')} />
          </ListGroup>
        ) : null}
        <span className="tr-muted" style={{ fontSize: 12, lineHeight: '16px' }}>
          {t('footer')}
        </span>
      </div>
    </Screen>
  );
}
