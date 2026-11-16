"use client";
import { useRef, useState } from "react";
import { lookupGrievance, type GrievanceRecord } from "@/mock/endpoints/grievance";
import { RefSearch, type FieldError } from "./RefSearch";
import { StatusCard } from "./StatusCard";
import { MyGrievances } from "./MyGrievances";
import { validateRef } from "./tracking";
import s from "./Track.module.css";

/** /grievances/track: find a grievance by number, follow its status, and (signed in) list your grievances. */
export function GrievanceTracker() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FieldError | null>(null);
  const [record, setRecord] = useState<GrievanceRecord | null>(null);
  const [lookups, setLookups] = useState(0);
  const [version, setVersion] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  const track = async (ref: string) => {
    const invalid = validateRef(ref);
    if (invalid) {
      setError({ key: invalid });
      setRecord(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const found = await lookupGrievance(ref);
      setRecord(found);
      setLookups((n) => n + 1);
      if (!found) setError({ key: "gt.notFound", vars: { ref } });
      else requestAnimationFrame(() => resultRef.current?.focus());
    } catch {
      setRecord(null);
      setError({ key: "gt.errLookup" });
    } finally {
      setBusy(false);
    }
  };

  const view = (ref: string) => {
    setText(ref);
    void track(ref);
  };

  return (
    <div className={s.main}>
      <RefSearch value={text} onChange={(v) => { setText(v); setError(null); }} onSubmit={() => void track(text)} busy={busy} error={error} />
      <div ref={resultRef} tabIndex={-1} className={s.result}>
        {record && <StatusCard key={`${record.ref}#${lookups}`} initial={record} onUpdate={() => setVersion((v) => v + 1)} />}
      </div>
      <MyGrievances version={version} onView={view} />
    </div>
  );
}
