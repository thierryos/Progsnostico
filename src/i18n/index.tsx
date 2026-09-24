import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { storage } from '../lib/storage';
import { en } from './en';
import { es } from './es';
import { pt, type TranslationKey } from './pt';

export type Language = 'pt' | 'en' | 'es';
export type { TranslationKey };
export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export const LANGUAGES: Language[] = ['pt', 'en', 'es'];

const dictionaries: Record<Language, Record<TranslationKey, string>> = { pt, en, es };

const LANG_KEY = 'prog.lang';

const detectLanguage = (): Language => {
  const saved = storage.get(LANG_KEY);
  if (saved === 'pt' || saved === 'en' || saved === 'es') return saved;
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'pt';
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('en')) return 'en';
  return 'pt';
};

export const translate = (
  lang: Language,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string => {
  const text = dictionaries[lang][key] ?? pt[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
};

interface I18nValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translate;
}

const I18nContext = createContext<I18nValue | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Language>(detectLanguage);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    storage.set(LANG_KEY, next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars) }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n precisa estar dentro de <I18nProvider>');
  return ctx;
};
