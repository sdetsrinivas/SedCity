"use client";
import { useEffect, useState } from "react";
import { store } from "@/mock/store";

export function VisitCounter({ label }: { label: string }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    const base = 4_812_337;
    const visits = store.get<number>("visits", 0) + 1;
    store.set("visits", visits);
    setN(base + visits);
  }, []);
  return <span>{label}: {n === null ? "—" : n.toLocaleString("en-IN")}</span>;
}
