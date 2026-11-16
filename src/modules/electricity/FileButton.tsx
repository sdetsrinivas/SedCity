"use client";
import { useRef, useState } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import type { FileMeta } from "./types";
import s from "./Electricity.module.css";

const ACCEPT = ["application/pdf", "image/jpeg", "image/png"];
const MAX = 2 * 1024 * 1024;
const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * FIL-02: the real <input type="file"> is display:none; the visible "Choose file" button forwards
 * the click. Selenium cannot sendKeys to it until it is made visible; Playwright's setInputFiles works.
 */
export function FileButton({ id, label, value, onChange, error }: {
  id: string; label: string; value: FileMeta | null; onChange: (f: FileMeta | null) => void; error?: string;
}) {
  const { t } = useT();
  const input = useRef<HTMLInputElement>(null);
  const [localErr, setLocalErr] = useState<DictKey | null>(null);
  const shown = localErr ?? (error as DictKey | undefined);

  const onPick = (f: File | undefined) => {
    if (!f) return;
    if (!ACCEPT.includes(f.type)) { setLocalErr("el.errFileType"); onChange(null); }
    else if (f.size > MAX) { setLocalErr("el.errFileSize"); onChange(null); }
    else { setLocalErr(null); onChange({ name: f.name, size: f.size, type: f.type }); }
    if (input.current) input.current.value = "";
  };

  return (
    <div className="field">
      <span className="label" id={`${id}-label`}>{label}</span>
      <input ref={input} id={id} name={id} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
        aria-labelledby={`${id}-label`} onChange={(e) => onPick(e.target.files?.[0])} />
      <div className={`${s.fileBox} ${shown ? s.fileBoxErr : ""}`}>
        <button type="button" className="btn btn-outline" aria-describedby={`${id}-label`} onClick={() => input.current?.click()}>
          <Icon name="file" size={16} /> {value ? t("el.replaceFile") : t("el.chooseFile")}
        </button>
        {value ? (
          <span className={s.fileName}>
            {value.name} <span className="muted small">({kb(value.size)})</span>
            <button type="button" className={s.fileRemove} aria-label={t("el.removeFile", { name: value.name })} onClick={() => onChange(null)}>
              <Icon name="close" size={14} />
            </button>
          </span>
        ) : <span className="muted small">{t("el.noFile")}</span>}
      </div>
      <span className="help">{t("el.fileHelp")}</span>
      {shown && <span className="error" role="alert">{t(shown)}</span>}
    </div>
  );
}
