"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { pick, type DictKey } from "@/i18n";
import { listStreets, listWards, listZones, streetById, type Street, type Ward, type Zone } from "@/mock/endpoints/geo";
import type { StepProps } from "./types";
import s from "./Electricity.module.css";

/**
 * DRP-08: cascading native selects. Zone options load after ZONE_LIST (800ms); choosing a zone
 * clears ward + street and loads wards after WARD_LIST (2s); choosing a ward loads streets after
 * STREET_LIST (random 1–4s). While loading, the select is disabled with a single "Loading…" option.
 * Out-of-order responses are discarded.
 */
export function StepPremises({ draft, set, errors }: StepProps) {
  const { t, lang } = useT();
  const [zones, setZones] = useState<Zone[] | null>(null);
  const [wards, setWards] = useState<Ward[] | null>(null);
  const [streets, setStreets] = useState<Street[] | null>(null);
  const wardReq = useRef(0);
  const streetReq = useRef(0);

  useEffect(() => { listZones().then(setZones); }, []);

  useEffect(() => {
    setWards(null);
    if (!draft.zoneId) return;
    const mine = ++wardReq.current;
    listWards(draft.zoneId).then((w) => mine === wardReq.current && setWards(w));
  }, [draft.zoneId]);

  useEffect(() => {
    setStreets(null);
    if (!draft.wardId) return;
    const mine = ++streetReq.current;
    listStreets(draft.wardId).then((st) => mine === streetReq.current && setStreets(st));
  }, [draft.wardId]);

  const onZone = (v: string) => { set("zoneId", v); set("wardId", ""); set("streetId", ""); };
  const onWard = (v: string) => { set("wardId", v); set("streetId", ""); };
  const pincode = draft.streetId ? streetById(draft.streetId)?.pincode ?? "" : "";
  const err = (k: keyof typeof errors) => errors[k] && <span className="error" id={`err-${k}`}>{t(errors[k] as DictKey)}</span>;

  return (
    <>
      <div className={s.grid3}>
        <div className="field">
          <label htmlFor="el-zone">{t("el.zone")}</label>
          <select id="el-zone" className="select" value={draft.zoneId} disabled={!zones} onChange={(e) => onZone(e.target.value)} aria-invalid={!!errors.zoneId}>
            {!zones ? <option value="">{t("el.loadingZones")}</option> : (
              <>
                <option value="">{t("el.selectZone")}</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{pick(z, lang)}</option>)}
              </>
            )}
          </select>
        </div>
        <div className="field">
          <label htmlFor="el-ward">{t("el.ward")}</label>
          <select id="el-ward" className="select" value={draft.wardId} disabled={!wards} onChange={(e) => onWard(e.target.value)} aria-invalid={!!errors.zoneId}>
            {!draft.zoneId ? <option value="">{t("el.selectZoneFirst")}</option> : !wards ? <option value="">{t("el.loadingWards")}</option> : (
              <>
                <option value="">{t("el.selectWard")}</option>
                {wards.map((w) => <option key={w.id} value={w.id}>{pick(w, lang)}</option>)}
              </>
            )}
          </select>
        </div>
        <div className="field">
          <label htmlFor="el-street">{t("el.street")}</label>
          <select id="el-street" className="select" value={draft.streetId} disabled={!streets} onChange={(e) => set("streetId", e.target.value)} aria-invalid={!!errors.zoneId}>
            {!draft.wardId ? <option value="">{t("el.selectWardFirst")}</option> : !streets ? <option value="">{t("el.loadingStreets")}</option> : (
              <>
                <option value="">{t("el.selectStreet")}</option>
                {streets.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
              </>
            )}
          </select>
        </div>
      </div>
      {err("zoneId")}
      <div className={s.grid3}>
        <div className="field">
          <label htmlFor="el-door">{t("el.door")}</label>
          <input id="el-door" className="input" value={draft.door} onChange={(e) => set("door", e.target.value)} aria-invalid={!!errors.door} />
          {err("door")}
        </div>
        <div className="field">
          <label htmlFor="el-landmark">{t("el.landmark")}</label>
          <input id="el-landmark" className="input" value={draft.landmark} onChange={(e) => set("landmark", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="el-pincode">{t("el.pincode")}</label>
          <input id="el-pincode" className="input" value={pincode} readOnly tabIndex={-1} />
        </div>
      </div>
    </>
  );
}
