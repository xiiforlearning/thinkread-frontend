import { currentLang, type Lang, useLang } from './lang';

/** A screen's strings in both languages; the keys are the Russian dictionary's keys. */
export interface Dict<K extends string> {
  ru: Record<K, string>;
  en: Record<K, string>;
}

export function defineDict<K extends string>(dict: Dict<K>): Dict<K> {
  return dict;
}

export type Params = Record<string, string | number>;

function fill(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** Translate outside React (helpers, labels); `{name}` placeholders come from `params`. */
export function tr<K extends string>(
  dict: Dict<K>,
  key: K,
  params?: Params,
  lang = currentLang(),
): string {
  return fill(dict[lang][key] ?? dict.ru[key], params);
}

/** Translate inside a component; re-renders when the language switches. */
export function useT<K extends string>(dict: Dict<K>): (key: K, params?: Params) => string {
  const lang = useLang();
  return (key, params) => fill(dict[lang][key] ?? dict.ru[key], params);
}

/** Pick one of the forms for `n`: Russian one/few/many, English one/other. */
export function plural(
  n: number,
  forms: { ru: [string, string, string]; en: [string, string] },
  lang: Lang = currentLang(),
): string {
  if (lang === 'en') return Math.abs(n) === 1 ? forms.en[0] : forms.en[1];
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms.ru[2];
  if (last > 1 && last < 5) return forms.ru[1];
  if (last === 1) return forms.ru[0];
  return forms.ru[2];
}
