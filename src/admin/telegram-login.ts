/**
 * "Log in with Telegram" (OpenID Connect): Telegram's library opens a popup and hands back a
 * signed `id_token`; the backend checks it against Telegram's public keys. BotFather must list
 * this page as the redirect URL (`<origin>/admin.html`) and the origin as trusted — the library
 * sends the current page as `redirect_uri`, matched exactly, so the query and hash are dropped
 * for the duration of the call.
 */
const SCRIPT_URL = 'https://telegram.org/js/telegram-login.js';

interface TelegramLoginResult {
  id_token?: string;
  error?: string;
}

interface TelegramLoginApi {
  auth(
    options: { client_id: number | string; request_access?: string[]; lang?: string },
    callback: (result: TelegramLoginResult) => void,
  ): void;
}

/** `window.Telegram` is declared by `telegram/webapp.ts` for the Mini App; the dashboard reads `.Login`. */
function loaded(): TelegramLoginApi | undefined {
  return (window.Telegram as { Login?: TelegramLoginApi } | undefined)?.Login;
}

let loading: Promise<TelegramLoginApi> | null = null;

export function loadTelegramLogin(): Promise<TelegramLoginApi> {
  const present = loaded();
  if (present) return Promise.resolve(present);
  if (!loading) {
    loading = new Promise<TelegramLoginApi>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        const api = loaded();
        if (api) resolve(api);
        else reject(new Error('Библиотека входа Telegram загрузилась без Telegram.Login.'));
      };
      script.onerror = () => reject(new Error('Не удалось загрузить библиотеку входа Telegram.'));
      document.head.appendChild(script);
    }).catch((err: unknown) => {
      loading = null;
      throw err;
    });
  }
  return loading;
}

export class PopupBlockedError extends Error {
  constructor() {
    super('Браузер заблокировал окно Telegram. Разрешите всплывающие окна для этого сайта.');
    this.name = 'PopupBlockedError';
  }
}

/** Opens the popup; resolves with the id_token, or null when the user closed it. */
export async function signInWithTelegram(clientId: string): Promise<string | null> {
  const api = await loadTelegramLogin();
  const original = window.location.pathname + window.location.search + window.location.hash;
  const clean = window.location.pathname;
  let opened: Window | null | undefined;
  const nativeOpen = window.open;
  try {
    if (original !== clean) history.replaceState(history.state, '', clean);
    return await new Promise<string | null>((resolve, reject) => {
      window.open = (...args: Parameters<typeof window.open>): Window | null => {
        opened = nativeOpen.apply(window, args);
        if (opened === null) reject(new PopupBlockedError());
        return opened;
      };
      api.auth({ client_id: clientId, lang: 'ru' }, (result) => {
        if (result.id_token) resolve(result.id_token);
        else if (!result.error || result.error === 'popup_closed') resolve(null);
        else reject(new Error(`Telegram: ${result.error}`));
      });
    });
  } finally {
    window.open = nativeOpen;
    if (original !== clean) history.replaceState(history.state, '', original);
  }
}
