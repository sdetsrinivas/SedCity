"use client";
import { useState } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { formatINR } from "@/lib/format";
import { EditableCell } from "./EditableCell";
import { AREA_MAX, AREA_MIN, MAX_FLOORS, OCCUPANCIES, floorArv, parseArea, type Floor, type Occupancy } from "./tax";
import s from "./PropertyTax.module.css";

const OCC_KEY: Record<Occupancy, DictKey> = { self: "pt.occSelf", rented: "pt.occRented" };
const nextId = () => `f${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

interface Props {
  floors: Floor[];
  /** Unit area value, or null until locality and usage are known. */
  uav: number | null;
  error?: DictKey;
  onChange: (floors: Floor[]) => void;
}

/**
 * TBL-05: floors as a table with editable "Plinth area" and "Occupancy" cells (see EditableCell).
 * DLG-02: "Remove" asks with a native `window.confirm`; cancelling keeps the floor.
 */
export function FloorsTable({ floors, uav, error, onChange }: Props) {
  const { t } = useT();
  const [editing, setEditing] = useState<{ id: string; col: "area" | "occupancy" } | null>(null);
  const floorName = (level: number) => (level <= 5 ? t(`pt.floor${level}` as DictKey) : t("pt.floorN", { n: level }));
  const update = (id: string, patch: Partial<Floor>) => onChange(floors.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const total = floors.reduce((sum, f) => sum + (uav ? floorArv(f, uav) : 0), 0);

  const add = () => {
    const level = floors.length ? Math.max(...floors.map((f) => f.level)) + 1 : 0;
    const id = nextId();
    onChange([...floors, { id, level, area: null, occupancy: "self" }]);
    setEditing({ id, col: "area" });
  };

  const remove = (f: Floor) => {
    // DLG-02: native confirm dialog.
    if (!window.confirm(t("pt.confirmRemove", { floor: floorName(f.level) }))) return;
    if (editing?.id === f.id) setEditing(null);
    onChange(floors.filter((x) => x.id !== f.id));
  };

  return (
    <>
      <div className={s.tableWrap}>
        <table id="pt-floors" className={`data-table ${s.floors}`}>
          <caption className="sr-only">{t("pt.floorsCaption")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("pt.colFloor")}</th>
              <th scope="col">{t("pt.colArea")}</th>
              <th scope="col">{t("pt.colOccupancy")}</th>
              <th scope="col" className={s.num}>{t("pt.colArv")}</th>
              <th scope="col"><span className="sr-only">{t("pt.colAction")}</span></th>
            </tr>
          </thead>
          <tbody>
            {floors.map((f) => {
              const name = floorName(f.level);
              return (
                <tr key={f.id}>
                  <th scope="row">{name}</th>
                  <EditableCell
                    display={f.area ? f.area.toLocaleString("en-IN") : "—"}
                    editLabel={t("pt.editArea", { floor: name })}
                    editing={editing?.id === f.id && editing.col === "area"}
                    onEdit={() => setEditing({ id: f.id, col: "area" })}
                    onDone={() => setEditing(null)}
                    initial={f.area ? String(f.area) : ""}
                    validate={(raw) => (parseArea(raw) ? null : t("pt.errArea", { min: AREA_MIN, max: AREA_MAX.toLocaleString("en-IN") }))}
                    onCommit={(raw) => update(f.id, { area: parseArea(raw) })}
                  />
                  <EditableCell
                    display={t(OCC_KEY[f.occupancy])}
                    editLabel={t("pt.editOccupancy", { floor: name })}
                    editing={editing?.id === f.id && editing.col === "occupancy"}
                    onEdit={() => setEditing({ id: f.id, col: "occupancy" })}
                    onDone={() => setEditing(null)}
                    options={OCCUPANCIES.map((o) => ({ value: o, label: t(OCC_KEY[o]) }))}
                    initial={f.occupancy}
                    onCommit={(raw) => update(f.id, { occupancy: raw as Occupancy })}
                  />
                  <td className={s.num}>{uav && f.area ? formatINR(floorArv(f, uav)) : "—"}</td>
                  <td className={s.actions}>
                    {floors.length > 1 && (
                      <button type="button" className="link-btn" aria-label={t("pt.removeFloor", { floor: name })} onClick={() => remove(f)}>
                        {t("pt.remove")}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>{t("pt.totalArv")}</th>
              <td className={s.num}>{uav ? formatINR(total) : "—"}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className={s.floorsFoot}>
        <button type="button" className="btn btn-outline" onClick={add} disabled={floors.length >= MAX_FLOORS}>
          {t("pt.addFloor")}
        </button>
        <span className="help">{t("pt.floorsHelp")}</span>
      </div>
      {error && <span className="error">{t(error)}</span>}
    </>
  );
}
