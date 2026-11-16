import { en, type Dict, type DictKey } from "./en";
import { ta } from "./ta";

export type Lang = "en" | "ta";
export const LANGS: Lang[] = ["en", "ta"];
export const LANG_COOKIE = "amc_lang";
export const dictionaries: Record<Lang, Dict> = { en, ta };

export const isLang = (v: unknown): v is Lang => v === "en" || v === "ta";

export function translate(dict: Dict, key: DictKey, vars?: Record<string, string | number>): string {
  let s: string = dict[key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Pick the localized field from mock data shaped { en, ta }. */
export const pick = <T,>(v: { en: T; ta: T }, lang: Lang): T => v[lang] ?? v.en;

export type { Dict, DictKey };
