"use client";
import { useRef, useState } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { checkProof } from "./birth";
import s from "./Certificates.module.css";

export interface ProofMeta {
  name: string;
  size: number;
  type: string;
}

const size = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * FIL-01: a plain, visible <input type="file">. `accept` only filters the OS dialog; files set by a
 * script or a driver are checked here (type and size) and a rejected file is cleared from the input.
 */
export function ProofInput({ value, onChange, error }: { value: ProofMeta | null; onChange: (f: ProofMeta | null) => void; error?: string }) {
  const { t } = useT();
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<{ key: DictKey; name: string } | null>(null);
  const shown = problem ? t(problem.key, { name: problem.name }) : error;

  const onPick = (f: File | undefined) => {
    if (!f) { setProblem(null); onChange(null); return; }
    const p = checkProof(f);
    setProblem(p ? { key: p, name: f.name } : null);
    if (p) {
      onChange(null);
      if (input.current) input.current.value = "";
    } else {
      onChange({ name: f.name, size: f.size, type: f.type });
    }
  };

  return (
    <div className="field">
      <label htmlFor="bc-proof">{t("bc.proof")}</label>
      <input ref={input} id="bc-proof" name="proof" type="file" accept=".pdf,.jpg,.jpeg,.png" className={s.file}
        aria-invalid={!!shown} aria-describedby="bc-proof-help" onChange={(e) => onPick(e.target.files?.[0])} />
      <span className="help" id="bc-proof-help">{t("bc.proofHelp")}</span>
      {value && <span className={s.attached} id="bc-proof-name">{t("bc.proofAttached", { name: value.name, size: size(value.size) })}</span>}
      {problem ? <span className="error" role="alert">{shown}</span> : shown && <span className="error">{shown}</span>}
    </div>
  );
}
