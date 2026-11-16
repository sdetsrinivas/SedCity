"use client";
import { useId, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import s from "./PropertyTax.module.css";

/**
 * DLG-12: tooltip. The `role="tooltip"` element is only in the DOM while the info button is hovered or
 * focused (it is referenced by the button's `aria-describedby` meanwhile); Escape, blur or moving the
 * pointer away removes it again.
 */
export function InfoTip({ label, text }: { label: string; text: string }) {
  const id = useId();
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const open = hover || focus;
  return (
    <span className={s.tipWrap} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        type="button"
        className={s.tipButton}
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setHover(false);
            setFocus(false);
          }
        }}
        onClick={() => setFocus(true)}
      >
        <Icon name="info" size={16} />
      </button>
      {open && <span role="tooltip" id={id} className={s.tip}>{text}</span>}
    </span>
  );
}
