"use client";
import { useRef, type ClipboardEvent } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { DESC_MAX, DESC_MIN } from "./validate";
import s from "./Grievance.module.css";

const plainText = (el: HTMLElement) => (el.innerText ?? el.textContent ?? "").replace(/ /g, " ");

/**
 * TXT-06: the description is a <div contenteditable role="textbox" aria-multiline="true">, not a
 * <textarea>. It has no value property; the text is read from the element on every `input` event, so
 * changing its content from script without an input event leaves the form (and the counter) unchanged.
 * Pasted content is inserted as plain text.
 */
export function DescriptionEditor({ length, onChange, error }: { length: number; onChange: (text: string) => void; error?: DictKey }) {
  const { t } = useT();
  const box = useRef<HTMLDivElement>(null);

  const read = () => {
    const el = box.current;
    if (!el) return;
    const text = plainText(el);
    // Browsers leave a stray <br> behind when everything is deleted; clear it so the placeholder shows again.
    if (!text.trim() && el.innerHTML !== "") el.innerHTML = "";
    onChange(text);
  };

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    if (!document.execCommand?.("insertText", false, text)) {
      box.current?.append(document.createTextNode(text));
      read();
    }
  };

  const over = length > DESC_MAX;
  return (
    <div className="field">
      <span className="label" id="gr-description-label">{t("gr.description")}</span>
      <div
        ref={box}
        id="gr-description"
        className={s.editor}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-labelledby="gr-description-label"
        aria-describedby="gr-description-help"
        aria-invalid={!!error}
        data-placeholder={t("gr.descPlaceholder")}
        spellCheck
        onInput={read}
        onPaste={onPaste}
      />
      <div className={s.editorFoot}>
        <span className="help" id="gr-description-help">{t("gr.descHelp", { min: DESC_MIN, max: DESC_MAX })}</span>
        <span className={`small ${over ? s.counterOver : "muted"}`} aria-live="polite">{t("gr.descCount", { n: length, max: DESC_MAX })}</span>
      </div>
      {error && <span className="error">{t(error, { min: DESC_MIN, max: DESC_MAX })}</span>}
    </div>
  );
}
