import type { ResourceKey } from "i18next";

import type { Locale } from "./locales";

import tlAuth from "../../locales/tl/auth.json";
import tlCommon from "../../locales/tl/common.json";
import tlDates from "../../locales/tl/dates.json";
import tlPantry from "../../locales/tl/pantry.json";
import tlPay from "../../locales/tl/pay.json";
import tlRecord from "../../locales/tl/record.json";
import tlToday from "../../locales/tl/today.json";
import tlWeek from "../../locales/tl/week.json";
import enAuth from "../../locales/en/auth.json";
import enCommon from "../../locales/en/common.json";
import enDates from "../../locales/en/dates.json";
import enPantry from "../../locales/en/pantry.json";
import enPay from "../../locales/en/pay.json";
import enRecord from "../../locales/en/record.json";
import enToday from "../../locales/en/today.json";
import enWeek from "../../locales/en/week.json";
import esAuth from "../../locales/es/auth.json";
import esCommon from "../../locales/es/common.json";
import esDates from "../../locales/es/dates.json";
import esPantry from "../../locales/es/pantry.json";
import esPay from "../../locales/es/pay.json";
import esRecord from "../../locales/es/record.json";
import esToday from "../../locales/es/today.json";
import esWeek from "../../locales/es/week.json";
import zhAuth from "../../locales/zh-CN/auth.json";
import zhCommon from "../../locales/zh-CN/common.json";
import zhDates from "../../locales/zh-CN/dates.json";
import zhPantry from "../../locales/zh-CN/pantry.json";
import zhPay from "../../locales/zh-CN/pay.json";
import zhRecord from "../../locales/zh-CN/record.json";
import zhToday from "../../locales/zh-CN/today.json";
import zhWeek from "../../locales/zh-CN/week.json";
import jaAuth from "../../locales/ja/auth.json";
import jaCommon from "../../locales/ja/common.json";
import jaDates from "../../locales/ja/dates.json";
import jaPantry from "../../locales/ja/pantry.json";
import jaPay from "../../locales/ja/pay.json";
import jaRecord from "../../locales/ja/record.json";
import jaToday from "../../locales/ja/today.json";
import jaWeek from "../../locales/ja/week.json";

/**
 * Every language's catalog, one file per area under locales/<language>/,
 * merged into a single namespace so a key reads "area.key" ("tabs.today").
 * Taglish is the reference: its shape is the type every key is checked
 * against, and lib/i18n/i18n.test.ts holds the others to it. A new area
 * file is added here for every language at once.
 */
export const tl = {
  ...tlAuth,
  ...tlCommon,
  ...tlDates,
  ...tlPantry,
  ...tlPay,
  ...tlRecord,
  ...tlToday,
  ...tlWeek,
};

export type Catalog = typeof tl;

export const RESOURCES: Record<Locale, { translation: ResourceKey }> = {
  tl: { translation: tl },
  en: {
    translation: {
      ...enAuth,
      ...enCommon,
      ...enDates,
      ...enPantry,
      ...enPay,
      ...enRecord,
      ...enToday,
      ...enWeek,
    },
  },
  es: {
    translation: {
      ...esAuth,
      ...esCommon,
      ...esDates,
      ...esPantry,
      ...esPay,
      ...esRecord,
      ...esToday,
      ...esWeek,
    },
  },
  "zh-CN": {
    translation: {
      ...zhAuth,
      ...zhCommon,
      ...zhDates,
      ...zhPantry,
      ...zhPay,
      ...zhRecord,
      ...zhToday,
      ...zhWeek,
    },
  },
  ja: {
    translation: {
      ...jaAuth,
      ...jaCommon,
      ...jaDates,
      ...jaPantry,
      ...jaPay,
      ...jaRecord,
      ...jaToday,
      ...jaWeek,
    },
  },
};
