import { useSyncExternalStore } from 'react';

/** Interface languages. Russian is the school's default; English is opt-in or Telegram's language. */
export type Lang = 'ru' | 'en';
export const LANGS: Lang[] = ['ru', 'en'];

const KEY = 'thinkread.lang';
const listeners = new Set<() => void>();
let current: Lang | null = null;

function stored(): Lang | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'ru' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

/** Telegram's `language_code` (set by the Mini App), else the browser's language. */
export function detectLang(telegramCode?: string | null): Lang {
  const code = (telegramCode ?? navigator.language ?? '').toLowerCase();
  return code.startsWith('en') ? 'en' : 'ru';
}

export function currentLang(): Lang {
  if (current === null) current = stored() ?? detectLang();
  return current;
}

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* private mode */
  }
  document.documentElement.lang = lang;
  for (const l of listeners) l();
}

/** Has the person (or the profile) picked a language, or are we on the detected default? */
export function langChosen(): boolean {
  return stored() !== null;
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Re-renders the component when the language switches. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, currentLang, currentLang);
}
