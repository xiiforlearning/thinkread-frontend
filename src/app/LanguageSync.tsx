import { useEffect, useRef } from 'react';
import { LANG_SWITCH, currentLang, detectLang, langChosen, setLang } from '../i18n/lang';
import { tg } from '../telegram/webapp';
import { useProfile } from './hooks';
import { useApi } from './session';

/**
 * Keeps the app's language and the profile's in step. The profile wins when it has a language
 * (the bot's texts follow it, so the student sees one language everywhere); otherwise the one
 * detected from Telegram (or chosen on this device) is written to the profile once.
 */
export function LanguageSync() {
  const api = useApi();
  const profile = useProfile();
  const done = useRef(false);

  useEffect(() => {
    const p = profile.data;
    if (!LANG_SWITCH || !p || done.current) return;
    done.current = true;
    if (p.language) {
      setLang(p.language);
      return;
    }
    const lang = langChosen()
      ? currentLang()
      : detectLang(tg()?.initDataUnsafe.user?.language_code);
    setLang(lang);
    void api.me.setLanguage(lang).catch(() => undefined);
  }, [profile.data, api]);

  return null;
}
