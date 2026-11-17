"use client";
import { useRef, useState } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { DOCS_MAX, DOCS_MIN, checkDocuments } from "./trade";
import type { ProofMeta } from "./ProofInput";
import s from "./Certificates.module.css";

const size = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * FIL-04: one visible <input type="file" multiple>. The list below mirrors the input's current
 * FileList: choosing files again replaces the selection (the browser's own behaviour), it does not
 * add to it. A selection with any unusable file, or more than the maximum, is refused as a whole and
 * the input is cleared.
 */
export function DocumentsInput({ value, onChange, error }: { value: ProofMeta[]; onChange: (f: ProofMeta[]) => void; error?: string }) {
  const { t } = useT();
  const input = useRef<HTMLInputElement>(null);
  const [problems, setProblems] = useState<{ key: DictKey; name?: string }[]>([]);

  const onPick = (list: FileList | null) => {
    const files = list ? [...list] : [];
    const p = checkDocuments(files);
    setProblems(p);
    if (p.length) {
      onChange([]);
      if (input.current) input.current.value = "";
      return;
    }
    onChange(files.map((f) => ({ name: f.name, size: f.size, type: f.type })));
  };
  const clear = () => {
    if (input.current) input.current.value = "";
    setProblems([]);
    onChange([]);
  };

  return (
    <div className="field">
      <label htmlFor="tl-docs">{t("tl.docs")}</label>
      <input ref={input} id="tl-docs" name="documents" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className={s.file}
        aria-invalid={!!(problems.length || error)} aria-describedby="tl-docs-help" onChange={(e) => onPick(e.target.files)} />
      <span className="help" id="tl-docs-help">{t("tl.docsHelp", { docs: DOCS_MIN, most: DOCS_MAX })}</span>
      {value.length > 0 && (
        <div className={s.docList}>
          <span className="small muted" id="tl-docs-count">{t("tl.docsAttached", { n: value.length })}</span>
          <ul aria-labelledby="tl-docs-count">
            {value.map((f, i) => <li key={i}>{f.name} <span className="muted">({size(f.size)})</span></li>)}
          </ul>
          <button type="button" className="btn btn-ghost" onClick={clear}>{t("tl.docsClear")}</button>
        </div>
      )}
      {problems.length > 0 ? (
        <div className="error" role="alert">
          {problems.map((p, i) => <div key={i}>{t(p.key, { name: p.name ?? "", most: DOCS_MAX })}</div>)}
        </div>
      ) : error && <span className="error">{error}</span>}
    </div>
  );
}
