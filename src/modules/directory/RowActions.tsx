"use client";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { phoneHref, type Official } from "@/mock/endpoints/directory";
import s from "./Directory.module.css";

/**
 * BTN-02: icon-only row actions. Each control is only an SVG (aria-hidden); its name exists only in
 * `aria-label` (“View details of R. Senthil Kumar”, “Call …”, “Email …”) — no text, no title tooltip.
 * View details is a `<button>`; Call and Email are links (`tel:` with the extension after a pause, `mailto:`).
 */
export function RowActions({ official, onView }: { official: Official; onView: (o: Official) => void }) {
  const { t, lang } = useT();
  const name = pick(official.name, lang);
  return (
    <span className={s.actions}>
      <button type="button" className={s.iconAction} aria-label={t("dir.view", { name })} onClick={() => onView(official)}>
        <Icon name="user" size={18} />
      </button>
      <a className={s.iconAction} href={phoneHref(official)} aria-label={t("dir.call", { name })}>
        <Icon name="phone" size={18} />
      </a>
      <a className={s.iconAction} href={`mailto:${official.email}`} aria-label={t("dir.mail", { name })}>
        <Icon name="mail" size={18} />
      </a>
    </span>
  );
}
