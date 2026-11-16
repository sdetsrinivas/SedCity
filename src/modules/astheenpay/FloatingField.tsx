"use client";
import type { InputHTMLAttributes } from "react";
import s from "./AstheenPay.module.css";

/**
 * TXT-12: floating label. The <label> sits on top of the empty input like a placeholder and slides up
 * into the border when the field is focused or filled (CSS `:focus` / `:not(:placeholder-shown)`).
 * The input's real placeholder is a single space, so placeholder-based locators find nothing.
 */
export function FloatingField({
  id, label, error, ...input
}: { id: string; label: string; error?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "placeholder">) {
  return (
    <div className={s.float}>
      <input
        id={id}
        className={s.floatInput}
        placeholder=" "
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        {...input}
      />
      <label htmlFor={id} className={s.floatLabel}>{label}</label>
      {error && <span className={s.floatError} id={`${id}-err`}>{error}</span>}
    </div>
  );
}
