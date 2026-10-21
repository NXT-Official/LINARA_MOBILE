import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, parseLocale, type Locale } from "./locales";
import { translate, type MessageKey, type Vars } from "./translate";

export type Translate = (key: MessageKey, vars?: Vars) => string;

type LocaleState = { locale: Locale; setLocale: (locale: Locale) => void };

// Outside a provider everything is Taglish, as the app always was.
const LocaleContext = createContext<LocaleState>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

/**
 * The language she picked, kept on this phone (language code only). Until
 * it's read the app speaks Taglish; a phone that can't store it just stays
 * on Taglish next time.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    AsyncStorage.getItem(LOCALE_STORAGE_KEY)
      .then((raw) => setLocaleState(parseLocale(raw)))
      .catch(() => {});
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    AsyncStorage.setItem(LOCALE_STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleState {
  return useContext(LocaleContext);
}

export function useT(): Translate {
  const { locale } = useContext(LocaleContext);
  return useCallback<Translate>((key, vars) => translate(locale, key, vars), [locale]);
}
