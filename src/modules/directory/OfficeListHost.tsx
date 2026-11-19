"use client";
import { useEffect, useRef } from "react";
import type { OfficeRow } from "./offices";

type ListApi = {
  update: (next: { items?: OfficeRow[]; selectedId?: string | null; label?: string; emptyText?: string; resetScroll?: boolean }) => void;
  reveal: (id: string) => void;
  destroy: () => void;
};

interface Props {
  items: OfficeRow[];
  selectedId: string | null;
  /** Bumped when the list should scroll to the chosen office (e.g. it was chosen on the map). */
  reveal: { id: string; n: number } | null;
  /** Bumped when the order changes so the list starts again at the top. */
  orderKey: string;
  label: string;
  emptyText: string;
  onSelect: (id: string) => void;
}

/**
 * Host for the framework-free office list (OTH-20, src/vanilla/office-list.js). React renders only this
 * empty element; the module renders the rows itself and is told about new data through `update()`.
 */
export function OfficeListHost({ items, selectedId, reveal, orderKey, label, emptyText, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const api = useRef<ListApi | null>(null);
  const latest = useRef({ items, selectedId, label, emptyText, onSelect });
  latest.current = { items, selectedId, label, emptyText, onSelect };
  const order = useRef(orderKey);

  useEffect(() => {
    let cancelled = false;
    import("@/vanilla/office-list.js").then(({ mountOfficeList }) => {
      if (cancelled || !ref.current) return;
      const { items, selectedId, label, emptyText } = latest.current;
      api.current = mountOfficeList(ref.current, { items, selectedId, label, emptyText, onSelect: (id) => latest.current.onSelect(id) });
    });
    return () => {
      cancelled = true;
      api.current?.destroy();
      api.current = null;
    };
  }, []);

  useEffect(() => {
    const resetScroll = order.current !== orderKey;
    order.current = orderKey;
    api.current?.update({ items, selectedId, label, emptyText, resetScroll });
  }, [items, selectedId, label, emptyText, orderKey]);

  useEffect(() => {
    if (reveal) api.current?.reveal(reveal.id);
  }, [reveal]);

  return <div ref={ref} />;
}
