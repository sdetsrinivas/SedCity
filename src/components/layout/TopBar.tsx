"use client";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { Icon } from "@/components/ui/Icon";
import { store } from "@/mock/store";
import type { Lang } from "@/i18n";
import s from "./Header.module.css";

const SCALES = [0.9, 1, 1.1, 1.2];
export const THEME_COOKIE = "amc_theme";

export function TopBar({ initialTheme }: { initialTheme: "light" | "dark" }) {
  const { t, lang, setLang } = useT();
  const [theme, setTheme] = useState(initialTheme);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const saved = store.get<number>("fontScale", 1);
    setScale(saved);
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty("--font-size-base", `${16 * scale}px`);
  }, [scale]);

  const changeScale = (next: number) => {
    setScale(next);
    store.set("fontScale", next);
  };

  // OTH-24: dark mode — flips html[data-theme] immediately and persists in a cookie so SSR matches.
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  };

  const idx = SCALES.indexOf(scale);
  return (
    <div className={s.topbar}>
      <div className={`container ${s.topbarInner}`}>
        <div className={s.topLeft}>
          <a href="#main" className={s.skip}>{t("top.skip")}</a>
          <span className={s.sep} aria-hidden="true">|</span>
          <span className={s.helpline}>
            <Icon name="phone" size={14} /> {t("top.helpline")}: <a href="tel:1552026">155 2026</a>
          </span>
        </div>
        <div className={s.topRight}>
          <div className={s.fontGroup} role="group" aria-label="Text size">
            <button type="button" aria-label={t("top.fontSmaller")} disabled={idx <= 0} onClick={() => changeScale(SCALES[Math.max(0, idx - 1)])}>A-</button>
            <button type="button" aria-label={t("top.fontDefault")} onClick={() => changeScale(1)}>A</button>
            <button type="button" aria-label={t("top.fontLarger")} disabled={idx >= SCALES.length - 1} onClick={() => changeScale(SCALES[Math.min(SCALES.length - 1, idx + 1)])}>A+</button>
          </div>
          {/* OTH-23: language switch (cookie + server re-render) */}
          <div className={s.langGroup} role="group" aria-label={t("top.language")}>
            {(["en", "ta"] as Lang[]).map((l) => (
              <button key={l} type="button" lang={l} aria-pressed={lang === l} className={lang === l ? s.langActive : undefined} onClick={() => lang !== l && setLang(l)}>
                {l === "en" ? "English" : "தமிழ்"}
              </button>
            ))}
          </div>
          <button type="button" className={s.themeBtn} onClick={toggleTheme} aria-label={theme === "dark" ? t("top.themeLight") : t("top.themeDark")} title={theme === "dark" ? t("top.themeLight") : t("top.themeDark")}>
            <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
