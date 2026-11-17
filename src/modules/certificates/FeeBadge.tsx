"use client";
import { useEffect, useRef, type DetailedHTMLProps, type HTMLAttributes } from "react";
import { useT } from "@/i18n/client";
import { formatINR } from "@/lib/format";
import { quoteTradeFee } from "@/mock/endpoints/certificates";
import { defineFeeBadge, type FeeBadgeView } from "./feeBadgeElement";
import { AREA_MAX, AREA_MIN } from "./trade";

type FeeBadgeElement = HTMLElement & { view: FeeBadgeView | null };

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "amc-fee-badge": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

const validArea = (a: string) => {
  const n = Number(a);
  return a.trim() !== "" && Number.isInteger(n) && n >= AREA_MIN && n <= AREA_MAX;
};

/**
 * SHD-03: shows the annual licence fee in `<amc-fee-badge>` (closed shadow root, see
 * feeBadgeElement.ts). The quote comes from the mock licensing service after a TRADE_FEE delay.
 */
export function FeeBadge({ category, area }: { category: string; area: string }) {
  const { t } = useT();
  const ref = useRef<FeeBadgeElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    defineFeeBadge();
    const el = ref.current;
    if (!el) return;
    const id = ++seq.current;
    const label = t("tl.feeLabel");
    if (!category || !validArea(area)) {
      el.view = { state: "idle", label, note: t("tl.feeIdle") };
      return;
    }
    el.view = { state: "loading", label, note: t("tl.feeLoading") };
    quoteTradeFee(category, Number(area)).then(
      ({ fee }) => {
        if (id !== seq.current) return;
        el.view = fee == null
          ? { state: "error", label, note: t("tl.feeError") }
          : { state: "ready", label, amount: formatINR(fee), unit: t("tl.feeUnit"), note: t("tl.feeNote") };
      },
      () => { if (id === seq.current) el.view = { state: "error", label, note: t("tl.feeError") }; },
    );
  }, [category, area, t]);

  return <amc-fee-badge id="tl-fee" ref={ref} />;
}
