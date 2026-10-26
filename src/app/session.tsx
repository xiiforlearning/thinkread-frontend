import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type Api, HttpApi } from '../api/client';
import { MockApi } from '../api/mock';
import type { AccessStatus, ApiRole } from '../api/types';
import { sessionDict } from '../i18n/screens/session';
import { tr } from '../i18n/t';
import { apiBaseUrl } from '../lib/api-url';
import { initData, insideTelegram, tg } from '../telegram/webapp';

const TOKEN_KEY = 'thinkread.token';

/**
 * The student's JWT. Kept in memory first — Telegram's WebView does not always give us a
 * working sessionStorage — and mirrored to sessionStorage as a best effort for the dashboard
 * hand-over (`openDashboard`).
 */
let tokenInMemory: string | null = null;
function readToken(): string | null {
  if (tokenInMemory) return tokenInMemory;
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
function writeToken(token: string | null): void {
  tokenInMemory = token;
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — the in-memory copy serves this page */
  }
}

/**
 * Demo mode (in-memory data) only when asked for: `VITE_DEMO=1` at build time, or `?demo=…` in
 * the URL (`?demo=1`; `pending|not_member|archived|staff` pick the first-login state). Outside
 * Telegram without it the app shows the "open in Telegram" screen instead of pretending.
 */
export function isDemo(): boolean {
  return (
    import.meta.env.VITE_DEMO === '1' || new URLSearchParams(window.location.search).has('demo')
  );
}

/** The bot to open when the page is visited in a plain browser (`VITE_BOT_USERNAME`). */
export function botUsername(): string {
  return (import.meta.env.VITE_BOT_USERNAME ?? '').replace(/^@/, '');
}

function demoAccess(): AccessStatus {
  const v = new URLSearchParams(window.location.search).get('demo');
  if (v === 'pending') return 'PENDING_NAME';
  if (v === 'not_member') return 'NOT_MEMBER';
  if (v === 'archived') return 'ARCHIVED';
  if (v === 'staff') return 'STAFF';
  return 'ACTIVE';
}

/** Dashboard session keys (admin/session.tsx reads them; both pages share the origin). */
const ADMIN_TOKEN_KEY = 'thinkread.admin.token';
const ADMIN_USER_KEY = 'thinkread.admin.user';
const ADMIN_DEMO_KEY = 'thinkread.admin.demo';

/**
 * Hand a staff member over to the dashboard page with the same JWT: the token from
 * /auth/webapp already carries the OWNER / TEACHER role. In demo mode the dashboard demo is
 * switched on instead.
 */
export function openDashboard(roles: ApiRole[], demo: boolean): void {
  const role = roles.includes('OWNER') ? 'OWNER' : 'TEACHER';
  const tgUser = tg()?.initDataUnsafe.user;
  const name = tgUser?.first_name || tr(sessionDict, role === 'OWNER' ? 'owner' : 'teacher');
  try {
    if (demo) {
      localStorage.setItem(ADMIN_DEMO_KEY, JSON.stringify('1'));
    } else {
      localStorage.removeItem(ADMIN_DEMO_KEY);
      const token = readToken();
      if (token) localStorage.setItem(ADMIN_TOKEN_KEY, JSON.stringify(token));
    }
    localStorage.setItem(
      ADMIN_USER_KEY,
      JSON.stringify({ name, role, telegramUserId: tgUser?.id ?? null }),
    );
  } catch {
    /* private mode: the dashboard will ask to sign in */
  }
  window.location.assign('./admin.html');
}

export type SessionState =
  | { kind: 'loading' }
  /** A plain browser, no Telegram initData and no demo requested. */
  | { kind: 'outside' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; status: AccessStatus; roles: ApiRole[] };

interface SessionValue {
  api: Api;
  demo: boolean;
  state: SessionState;
  /** Re-run sign-in (e.g. "Проверить снова" after joining the group). */
  refresh: () => void;
  /** After /me/register succeeded. */
  activate: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const demo = useMemo(isDemo, []);
  const [state, setState] = useState<SessionState>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  // A 401 (expired or lost token) signs in again through Telegram instead of dropping the
  // token and failing every request after it; one re-login per failure, not a loop.
  const reauth = useRef(false);
  const api = useMemo<Api>(() => {
    if (demo) return new MockApi({ access: demoAccess() });
    return new HttpApi(apiBaseUrl(), readToken, () => {
      if (reauth.current) return;
      reauth.current = true;
      writeToken(null);
      setAttempt((n) => n + 1);
    });
  }, [demo]);

  useEffect(() => {
    let cancelled = false;
    if (!demo && !insideTelegram()) {
      setState({ kind: 'outside' });
      return undefined;
    }
    setState({ kind: 'loading' });
    api.auth
      .webApp(initData())
      .then((res) => {
        if (cancelled) return;
        writeToken(res.token);
        reauth.current = false;
        setState({ kind: 'ready', status: res.status, roles: res.roles });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          kind: 'error',
          message: e instanceof Error ? e.message : tr(sessionDict, 'loginFailed'),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [api, attempt, demo]);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);
  const activate = useCallback(
    () =>
      setState((s) => ({
        kind: 'ready',
        status: 'ACTIVE',
        roles: s.kind === 'ready' ? [...new Set<ApiRole>(['STUDENT', ...s.roles])] : ['STUDENT'],
      })),
    [],
  );

  const value = useMemo<SessionValue>(
    () => ({ api, demo, state, refresh, activate }),
    [api, demo, state, refresh, activate],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(SessionContext);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}

export function useApi(): Api {
  return useSession().api;
}
