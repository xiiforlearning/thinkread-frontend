import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { common } from '../i18n/common';
import { tr } from '../i18n/t';
import { ApiError, ERR } from '../api/types';
import { insideTelegram } from '../telegram/webapp';
import {
  Badge,
  Button,
  Callout,
  Icon,
  type TabKey,
  TabBar,
  TelegramHeader,
} from '../ui/components';
import { useBackButton } from './hooks';
import { useSession } from './session';

/**
 * Screen frame from the design: in-app title row (drawn only outside Telegram,
 * where the client has no chrome of its own), scrolling body, optional
 * sticky bottom bar (MainButton) and the tab bar on top-level screens.
 */
export function Screen({
  tab,
  back,
  head,
  bottom,
  children,
}: {
  tab?: TabKey;
  /** Route of the previous screen, or an in-screen step back; enables the Telegram BackButton. */
  back?: string | (() => void);
  /** Non-scrolling header block (title + segmented control). */
  head?: ReactNode;
  bottom?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { demo } = useSession();
  useBackButton(back ?? null);
  const native = insideTelegram();
  return (
    <div className="tr tr-mobile tr-app">
      {!native ? (
        <TelegramHeader
          back={!!back}
          onBack={() => (typeof back === 'string' ? navigate(back) : back?.())}
        />
      ) : null}
      {demo ? (
        <span className="tr-demo-badge">
          <Badge tone="cards">{tr(common, 'demo')}</Badge>
        </span>
      ) : null}
      {head ? <div className="tr-screen-head">{head}</div> : null}
      <div className="tr-screen">{children}</div>
      {bottom}
      {tab ? <TabBar active={tab} /> : null}
    </div>
  );
}

export function Loading({ text }: { text?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: 'var(--ink-2)',
        padding: '24px 0',
        justifyContent: 'center',
        fontSize: 14,
      }}
    >
      <Icon name="spinner" /> {text ?? tr(common, 'loading')}
    </div>
  );
}

/** A known API error code → a sentence the student can act on; unknown ones keep their code. */
const ERROR_KEY: Partial<Record<string, keyof typeof common.ru>> = {
  [ERR.PARSE_EMPTY]: 'errParseEmpty',
  [ERR.DAILY_LIMIT]: 'errDailyLimit',
  [ERR.WORDS_REQUIRED]: 'errWordsRequired',
  [ERR.REPORT_TOO_LONG]: 'errTooLong',
  [ERR.IMPORT_EXPIRED]: 'errImportExpired',
  [ERR.NOT_FOUND]: 'errNotFound',
  [ERR.AI_UNAVAILABLE]: 'errAi',
  [ERR.AI_RATE_LIMITED]: 'errAi',
  [ERR.TOO_MANY_REQUESTS]: 'errTooMany',
};

export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    const key = ERROR_KEY[e.errorCode];
    if (key) return tr(common, key);
    // The API's own message is "AppError [304254]" — not for a student's eyes.
    return /^AppError \[/.test(e.message) || !e.message
      ? tr(common, 'errWithCode', { code: e.code })
      : e.message;
  }
  if (e instanceof Error) return e.message;
  return tr(common, 'somethingWrong');
}

export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <Callout tone="bad" title={tr(common, 'failed')}>
      {errorText(error)}
      {retry ? (
        <div style={{ marginTop: 8 }}>
          <Button variant="secondary" size="sm" icon="refresh" onClick={retry}>
            {tr(common, 'retry')}
          </Button>
        </div>
      ) : null}
    </Callout>
  );
}
