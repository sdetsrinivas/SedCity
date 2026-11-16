"use client";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { MAX_PHOTOS, checkPhoto } from "./validate";
import s from "./Grievance.module.css";

export interface Photo { id: string; name: string; size: number; type: string; url: string }

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
let seq = 0;

/**
 * FIL-03: photos can only be dropped onto the zone (dragenter/dragover/drop handlers on a div). There is
 * no <input type="file"> anywhere on the page, and no button opens a file chooser.
 */
export function PhotoDrop({ photos, onChange }: { photos: Photo[]; onChange: (p: Photo[]) => void }) {
  const { t } = useT();
  const [over, setOver] = useState(false);
  const [problems, setProblems] = useState<{ name: string; key: DictKey }[]>([]);
  const latest = useRef(photos);
  latest.current = photos;

  // Release preview URLs when the form goes away.
  useEffect(() => () => latest.current.forEach((p) => p.url && URL.revokeObjectURL?.(p.url)), []);

  const accept = (files: File[]) => {
    const next = [...photos];
    const bad: { name: string; key: DictKey }[] = [];
    for (const f of files) {
      const err = checkPhoto(f);
      if (err) { bad.push({ name: f.name, key: err }); continue; }
      if (next.length >= MAX_PHOTOS) { bad.push({ name: f.name, key: "gr.errPhotoCount" }); continue; }
      const url = typeof URL.createObjectURL === "function" ? URL.createObjectURL(f) : "";
      next.push({ id: `p${++seq}`, name: f.name, size: f.size, type: f.type, url });
    }
    setProblems(bad);
    onChange(next);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    accept(Array.from(e.dataTransfer?.files ?? []));
  };
  const onDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    setOver(true);
  };

  const remove = (p: Photo) => {
    if (p.url) URL.revokeObjectURL?.(p.url);
    setProblems([]);
    onChange(photos.filter((x) => x.id !== p.id));
  };

  return (
    <div className="field">
      <span className="label" id="gr-photos-label">{t("gr.photos")}</span>
      <div
        className={`${s.drop} ${over ? s.dropOver : ""}`}
        role="group"
        aria-labelledby="gr-photos-label"
        aria-describedby="gr-photos-help"
        onDragEnter={onDrag}
        onDragOver={onDrag}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <Icon name="camera" size={28} />
        <strong>{t("gr.dropHere")}</strong>
        <span className="help" id="gr-photos-help">{t("gr.photosHelp", { max: MAX_PHOTOS })}</span>
      </div>
      {problems.length > 0 && (
        <ul className={`error ${s.problems}`} role="alert">
          {problems.map((p, i) => <li key={`${p.name}-${i}`}>{t(p.key, { name: p.name, max: MAX_PHOTOS })}</li>)}
        </ul>
      )}
      {photos.length > 0 && (
        <ul className={s.thumbs} aria-label={t("gr.photosAttached", { n: photos.length })}>
          {photos.map((p) => (
            <li key={p.id} className={s.thumb}>
              {p.url ? <img src={p.url} alt={p.name} /> : <span className={s.thumbBlank}><Icon name="camera" size={20} /></span>}
              <span className={s.thumbName}>{p.name}<span className="muted small"> ({kb(p.size)})</span></span>
              <button type="button" className={s.thumbRemove} aria-label={t("gr.removePhoto", { name: p.name })} onClick={() => remove(p)}>
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
