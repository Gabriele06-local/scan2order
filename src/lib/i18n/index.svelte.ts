import it from './it.json';
import en from './en.json';

export type Locale = 'it' | 'en';
type Translations = Record<string, Record<string, any>>;

const translations: Translations = { it, en };

let currentLocale: Locale = $state(
  (typeof localStorage !== 'undefined' && localStorage.getItem('locale') as Locale)
  || (typeof navigator !== 'undefined' && navigator.language.startsWith('it') ? 'it' : 'en')
);

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(lang: Locale) {
  currentLocale = lang;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('locale', lang);
  }
  document.documentElement.lang = lang;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let val: any = translations[currentLocale];
  for (const k of keys) {
    if (val == null) return key;
    val = val[k];
  }
  if (val == null) return key;
  if (typeof val === 'string' && params) {
    return val.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
  }
  return String(val ?? key);
}
