import { Screen } from '../app/Shell';
import { openDashboard, useSession } from '../app/session';
import { staffDict } from '../i18n/screens/staff';
import { useT } from '../i18n/t';
import { Cell, LetterTile, ListGroup, MainButton } from '../ui/components';

/** Owner / teacher without a student account: the Mini App hands them to the dashboard. */
export function StaffScreen() {
  const { state, demo } = useSession();
  const t = useT(staffDict);
  const roles = state.kind === 'ready' ? state.roles : [];
  const owner = roles.includes('OWNER');
  return (
    <Screen
      bottom={
        <MainButton icon="grid" onClick={() => openDashboard(roles, demo)}>
          {t('openDashboard')}
        </MainButton>
      }
    >
      <div className="tr-center">
        <LetterTile
          icon="grid"
          size="md"
          tone="brand"
          style={{ transform: 'scale(1.6)', margin: '16px 0' }}
        />
        <h1 className="tr-h1">{owner ? t('ownerTitle') : t('teacherTitle')}</h1>
        <p className="tr-body" style={{ margin: 0, color: 'var(--ink-2)' }}>
          {t('body', { settings: owner ? t('settingsSuffix') : '' })}
        </p>
        <ListGroup style={{ width: '100%', textAlign: 'left' }}>
          <Cell tile="1" tileTone="brand" title={t('step1')} subtitle={t('step1Sub')} />
          <Cell tile="2" tileTone="brand" title={t('step2')} subtitle={t('step2Sub')} />
        </ListGroup>
        <span className="tr-muted" style={{ fontSize: 12, lineHeight: '16px' }}>
          {t('footer')}
        </span>
      </div>
    </Screen>
  );
}
