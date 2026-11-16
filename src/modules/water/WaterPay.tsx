"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { lookupConsumer, type WaterBill } from "@/mock/endpoints/water";
import { normalizeConsumerNo } from "./bill";
import { ConsumerLookup } from "./ConsumerLookup";
import { BillDetails } from "./BillDetails";

type Status = "idle" | "loading" | "done" | "notFound" | "error";

/** Water bill: consumer lookup → bill details (payment follows in the next step of this flow). */
export function WaterPay({ initialRef }: { initialRef: string }) {
  const { t } = useT();
  const [value, setValue] = useState(() => normalizeConsumerNo(initialRef) ?? initialRef);
  const [formatError, setFormatError] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [bill, setBill] = useState<WaterBill | null>(null);
  const [searched, setSearched] = useState("");
  const requestId = useRef(0);

  const fetchBill = useCallback(async (raw: string) => {
    const no = normalizeConsumerNo(raw);
    if (!no) {
      setFormatError(true);
      return;
    }
    setValue(no);
    setFormatError(false);
    setBill(null);
    setSearched(no);
    setStatus("loading");
    const id = ++requestId.current;
    try {
      const result = await lookupConsumer(no);
      if (id !== requestId.current) return;
      setBill(result);
      setStatus(result ? "done" : "notFound");
    } catch {
      if (id === requestId.current) setStatus("error");
    }
  }, []);

  // Arriving from Quick Pay (/services/water/pay?ref=…) fetches the bill straight away.
  const autoFetched = useRef(false);
  useEffect(() => {
    if (autoFetched.current || !normalizeConsumerNo(initialRef)) return;
    autoFetched.current = true;
    void fetchBill(initialRef);
  }, [initialRef, fetchBill]);

  return (
    <>
      <ConsumerLookup
        value={value}
        onChange={(v) => { setValue(v); setFormatError(false); }}
        onSubmit={() => fetchBill(value)}
        loading={status === "loading"}
        formatError={formatError}
      />
      {status === "notFound" && <div className="alert alert-error" role="alert">{t("wt.errNotFound", { no: searched })}</div>}
      {status === "error" && <div className="alert alert-error" role="alert">{t("wt.errService")}</div>}
      {/* DYN-01: the bill panel is not in the DOM until CONSUMER_LOOKUP resolves (~2s); a new lookup removes it again. */}
      {status === "done" && bill && <BillDetails bill={bill} />}
    </>
  );
}
