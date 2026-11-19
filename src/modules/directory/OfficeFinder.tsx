"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { OFFICE_KINDS, OFFICES, matchOffices, officeById, type OfficeKind } from "@/mock/endpoints/directory";
import { LocateMe, type Located } from "./LocateMe";
import { OfficeListHost } from "./OfficeListHost";
import { OfficeDetails } from "./OfficeDetails";
import { OfficeMapFrame } from "./OfficeMapFrame";
import { formatKm, rowMeta, type OfficeRow } from "./offices";
import s from "./Offices.module.css";

/**
 * Find Nearest Office: the current location (DLG-17), search and type filters, the office list
 * (OTH-20, framework-free and virtualized), the details of the chosen office (DYN-08) and the map in a
 * late-loading frame (FRM-04). The Corporation Head Office is chosen at first.
 */
export function OfficeFinder() {
  const { t, lang } = useT();
  const [kind, setKind] = useState<OfficeKind | "">("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("HO");
  const [located, setLocated] = useState<Located | null>(null);
  const [reveal, setReveal] = useState<{ id: string; n: number } | null>(null);
  const revealCount = useRef(0);

  const kmById = useMemo(() => (located ? new Map(located.result.ranked.map((r) => [r.id, r.km])) : null), [located]);
  const offices = useMemo(
    () => matchOffices(kind, search, located?.result.ranked.map((r) => r.id)),
    [kind, search, located],
  );
  const rows = useMemo<OfficeRow[]>(
    () => offices.map((o) => ({
      id: o.id,
      title: pick(o.name, lang),
      meta: rowMeta(o, lang),
      distance: kmById ? t("off.km", { km: formatKm(kmById.get(o.id) ?? 0, lang) }) : undefined,
    })),
    [offices, lang, kmById, t],
  );

  const onLocated = useCallback((l: Located) => {
    setLocated(l);
    setSelectedId(l.result.ranked[0].id);
  }, []);
  const onMapSelect = useCallback((id: string) => {
    setSelectedId(id);
    setReveal({ id, n: ++revealCount.current });
  }, []);

  const selected = officeById(selectedId) ?? OFFICES[0];

  return (
    <>
      <div className={`card ${s.toolbar}`} role="group" aria-label={t("off.filters")}>
        <LocateMe located={located} onLocated={onLocated} onClear={() => setLocated(null)} />
        <div className={s.filters}>
          <div className="field">
            <label htmlFor="office-search">{t("off.search")}</label>
            <input id="office-search" className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="office-kind">{t("off.kind")}</label>
            <select id="office-kind" className="select" value={kind} onChange={(e) => setKind(e.target.value as OfficeKind | "")}>
              <option value="">{t("off.allKinds")}</option>
              {OFFICE_KINDS.map((k) => <option key={k.id} value={k.id}>{pick(k, lang)}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className={s.grid}>
        <section className={`card ${s.listCard}`} aria-labelledby="office-list-title">
          <div className={`card-title ${s.listHead}`}>
            <h2 id="office-list-title">{t("off.listTitle")}</h2>
            <span className={s.count} aria-live="polite">{t("off.count", { shown: offices.length, total: OFFICES.length })}</span>
          </div>
          <OfficeListHost
            items={rows}
            selectedId={selectedId}
            reveal={reveal}
            orderKey={`${kind}|${search}|${located ? "near" : "all"}`}
            label={t("off.listTitle")}
            emptyText={t("off.empty")}
            onSelect={setSelectedId}
          />
        </section>
        <OfficeDetails office={selected} km={kmById?.get(selected.id)} />
      </div>

      <OfficeMapFrame selectedId={selectedId} user={located?.from ?? null} onSelect={onMapSelect} />
    </>
  );
}
