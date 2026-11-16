"use client";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { useToast } from "@/components/ui/Toast";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/format";
import s from "./Electricity.module.css";

/** Copies text with the async Clipboard API, falling back to a hidden textarea + execCommand. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

/** DLG-19: the reference number is copied to the system clipboard; the button shows "Copied" for 2s. */
export function Confirmation({ refNo, inspectionDate, onRestart }: { refNo: string; inspectionDate: string; onRestart: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (await copyText(refNo)) {
      setCopied(true);
      toast({ message: t("el.copiedToast"), tone: "success" });
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <div className={s.done} role="status" aria-live="polite">
      <span className={s.doneIcon}><Icon name="check" size={32} /></span>
      <h2>{t("el.done")}</h2>
      <p className="muted">{t("el.doneBody")}</p>
      <div className={s.refBox}>
        <span className="small muted">{t("el.ref")}</span>
        <div className={s.refRow}>
          <output className={s.refNo} id="el-ref">{refNo}</output>
          <button type="button" className="btn btn-outline" onClick={copy} aria-label={t("el.copyRef")}>
            <Icon name={copied ? "check" : "file"} size={16} /> {copied ? t("el.copied") : t("el.copy")}
          </button>
        </div>
      </div>
      <p>{t("el.nextSteps", { date: formatDate(inspectionDate) })}</p>
      <div className={s.doneActions}>
        <Link href="/dashboard" className="btn btn-primary">{t("el.toDashboard")}</Link>
        <button type="button" className="btn btn-ghost" onClick={onRestart}>{t("el.another")}</button>
      </div>
    </div>
  );
}
