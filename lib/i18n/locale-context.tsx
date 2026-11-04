import { useCallback, useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { I18nextProvider, useTranslation } from "react-i18next";

import { i18n, type MessageKey, type Vars } from "./instance";
import { LOCALE_STORAGE_KEY, localeFromDevice, parseLocale, type Locale } from "./locales";

export type Translate = (key: MessageKey, vars?: Vars) => string;

/**
 * The language she picked, kept on this phone (language code only). With no
 * choice yet, the phone's own language decides (lib/i18n/locales.ts). Until
 * the stored choice is read the app speaks Taglish; a phone that can't store
 * it just starts from its own language again next time.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    AsyncStorage.getItem(LOCALE_STORAGE_KEY)
      .then((raw) => {
        const next = raw
          ? parseLocale(raw)
          : localeFromDevice(getLocales().map((l) => l.languageTag));
        void i18n.changeLanguage(next);
      })
      .catch(() => {});
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export function useLocale(): { locale: Locale; setLocale: (locale: Locale) => void } {
  const { i18n: instance } = useTranslation();
  const [locale, setLocaleState] = useState<Locale>(parseLocale(instance.language));
  useEffect(() => {
    const onChange = (lng: string) => setLocaleState(parseLocale(lng));
    instance.on("languageChanged", onChange);
    return () => instance.off("languageChanged", onChange);
  }, [instance]);

  const setLocale = useCallback(
    (next: Locale) => {
      void instance.changeLanguage(next);
      AsyncStorage.setItem(LOCALE_STORAGE_KEY, next).catch(() => {});
    },
    [instance],
  );
  return { locale, setLocale };
}

/** The current language's `t`; the screen re-renders when she switches. */
export function useT(): Translate {
  const { t } = useTranslation();
  return t as unknown as Translate;
}
