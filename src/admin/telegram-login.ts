/**
 * "Log in with Telegram" for the dashboard: the standard OpenID Connect authorization-code
 * flow with PKCE. The page sends the browser to `oauth.telegram.org/auth`; Telegram asks the
 * user to confirm and redirects back to this page with `?code=…&state=…`; the code plus the
 * PKCE verifier go to the backend, which swaps them for an id_token and checks it.
 * BotFather (Bot Settings → Login Widget) must list this page as the redirect URL
 * (`<origin>/admin.html`) — the query and hash are stripped when the flow starts.
 */
const AUTH_URL = 'https://oauth.telegram.org/auth';
const PENDING_KEY = 'thinkread.admin.tg-login';

interface Pending {
  state: string;
  verifier: string;
  redirectUri: string;
  /** Where the user was (hash route) before leaving the page. */
  returnTo: string;
}

function randomUrlSafe(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base64Url(buf);
}

function base64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function challengeOf(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(digest);
}

/** This page without query and hash — the exact redirect URL registered in BotFather. */
export function redirectUri(): string {
  return window.location.origin + window.location.pathname;
}

/** Leaves the page for Telegram; nothing runs after it resolves. */
export async function startTelegramLogin(clientId: string): Promise<void> {
  const verifier = randomUrlSafe(48);
  const state = randomUrlSafe(16);
  const pending: Pending = {
    state,
    verifier,
    redirectUri: redirectUri(),
    returnTo: window.location.hash,
  };
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  const url = new URL(AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', pending.redirectUri);
  url.searchParams.set('scope', 'openid profile');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', await challengeOf(verifier));
  url.searchParams.set('code_challenge_method', 'S256');
  window.location.assign(url.toString());
}

export interface TelegramReturn {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  returnTo: string;
}

/**
 * On page load: did Telegram just send us back? Reads and clears `?code&state` (or `?error`),
 * checks `state` against what this browser stored, and returns what the backend needs.
 * Throws when Telegram reported an error or the state does not match (a foreign link).
 */
export function takeTelegramReturn(): TelegramReturn | null {
  const q = new URLSearchParams(window.location.search);
  const code = q.get('code');
  const error = q.get('error');
  const description = q.get('error_description');
  const state = q.get('state');
  if (!code && !error) return null;

  let pending: Pending | null = null;
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    pending = raw ? (JSON.parse(raw) as Pending) : null;
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    pending = null;
  }
  // Drop the one-time parameters from the address bar whatever happens next.
  for (const k of ['code', 'state', 'error', 'error_description', 'scope', 'iss']) q.delete(k);
  const rest = q.toString();
  const clean = window.location.pathname + (rest ? `?${rest}` : '') + (pending?.returnTo ?? '');
  history.replaceState(history.state, '', clean);

  if (error) {
    throw new Error(
      error === 'access_denied'
        ? 'Вход отменён в Telegram.'
        : `Telegram не подтвердил вход: ${description ?? error}.`,
    );
  }
  if (!pending || !state || state !== pending.state)
    throw new Error(
      'Ссылка входа устарела или открыта в другом браузере. Нажмите «Войти через Telegram» ещё раз.',
    );
  return {
    code: code as string,
    codeVerifier: pending.verifier,
    redirectUri: pending.redirectUri,
    returnTo: pending.returnTo,
  };
}
