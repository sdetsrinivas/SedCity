import "server-only";
import { cookies } from "next/headers";
import { dictionaries, isLang, LANG_COOKIE, translate, type DictKey, type Lang } from "./index";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : "en";
}

export async function getT() {
  const lang = await getLang();
  const dict = dictionaries[lang];
  return { lang, t: (k: DictKey, vars?: Record<string, string | number>) => translate(dict, k, vars) };
}
