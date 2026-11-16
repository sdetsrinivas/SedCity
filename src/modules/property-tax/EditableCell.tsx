"use client";
import { useState } from "react";
import s from "./PropertyTax.module.css";

interface Props {
  /** Text shown while not editing. */
  display: string;
  /** Accessible name of the editor (input or select) once it opens. */
  editLabel: string;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
  /** Area cells get a text input, occupancy cells a select. */
  options?: { value: string; label: string }[];
  initial: string;
  /** Returns an error message, or null when the raw value can be committed. */
  validate?: (raw: string) => string | null;
  onCommit: (raw: string) => void;
}

/**
 * TBL-05: editable cell. While not editing it is a plain `<td>` holding text (no input exists);
 * click, Enter or F2 swaps in an input/select. Enter or leaving the field commits, Escape cancels,
 * and an invalid area keeps the editor open with an error. After commit the editor is removed again.
 */
export function EditableCell({ display, editLabel, editing, onEdit, onDone, options, initial, validate, onCommit }: Props) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <td
        className={s.editable}
        tabIndex={0}
        onClick={() => { setDraft(initial); setError(null); onEdit(); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "F2") {
            e.preventDefault();
            setDraft(initial);
            setError(null);
            onEdit();
          }
        }}
      >
        {display}
      </td>
    );
  }

  const commit = (raw: string) => {
    const msg = validate?.(raw) ?? null;
    if (msg) {
      setError(msg);
      return false;
    }
    onCommit(raw);
    onDone();
    return true;
  };

  return (
    <td className={s.editing}>
      {options ? (
        <select
          className={`select ${s.cellInput}`}
          aria-label={editLabel}
          autoFocus
          value={draft}
          onChange={(e) => commit(e.target.value)}
          onBlur={onDone}
          onKeyDown={(e) => e.key === "Escape" && onDone()}
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <>
          <input
            className={`input ${s.cellInput}`}
            aria-label={editLabel}
            inputMode="numeric"
            autoFocus
            value={draft}
            aria-invalid={!!error}
            onChange={(e) => { setDraft(e.target.value); setError(null); }}
            onBlur={() => { if (!commit(draft)) onDone(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit(draft);
              } else if (e.key === "Escape") {
                e.preventDefault();
                onDone();
              }
            }}
          />
          {error && <span className={s.cellError} role="alert">{error}</span>}
        </>
      )}
    </td>
  );
}
