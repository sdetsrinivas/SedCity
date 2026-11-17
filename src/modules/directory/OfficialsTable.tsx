"use client";
import { useT } from "@/i18n/client";
import { pick, type DictKey } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { departmentById, HELPLINE, officeName, SORT_KEYS, type Official, type OfficialsQuery, type SortKey } from "@/mock/endpoints/directory";
import { RowActions } from "./RowActions";
import s from "./Directory.module.css";

interface Props {
  rows: Official[];
  /** Changes with every applied filter (HYD-04). */
  generation: number;
  sort: OfficialsQuery["sort"];
  dir: OfficialsQuery["dir"];
  onSort: (key: SortKey) => void;
  onView: (o: Official) => void;
}

/**
 * TBL-02: sortable table. The four text columns have a `<button>` in their header; the sorted column's `<th>`
 * carries `aria-sort` (ascending/descending), the others none. First click sorts ascending, the next one
 * reverses. Sorting happens in the mock service (DIRECTORY_PAGE) and goes back to page 1.
 *
 * HYD-04: rows are keyed by `${generation}-${official.id}`. Sorting and paging keep the generation, so
 * React moves a row that stays on screen; every applied filter (department, search, the filter read from
 * the address after hydration, Clear filters) bumps it, so every `<tr>` is replaced, even for officials
 * who are still listed with exactly the same text.
 */
export function OfficialsTable({ rows, generation, sort, dir, onSort, onView }: Props) {
  const { t, lang } = useT();
  return (
    <table className={`data-table ${s.table}`}>
      <thead>
        <tr>
          {SORT_KEYS.map((key) => (
            <th key={key} scope="col" aria-sort={sort === key ? (dir === "asc" ? "ascending" : "descending") : undefined}>
              <button type="button" className={s.sortBtn} onClick={() => onSort(key)}>
                {t(`dir.col.${key}` as DictKey)}
                <Icon
                  name={sort === key ? (dir === "asc" ? "arrowUp" : "arrowDown") : "sort"}
                  size={14}
                  className={sort === key ? undefined : s.sortIdle}
                />
              </button>
            </th>
          ))}
          <th scope="col">{t("dir.col.phone")}</th>
          <th scope="col"><span className="sr-only">{t("dir.col.actions")}</span></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((o) => {
          const dept = departmentById(o.department);
          return (
            <tr key={`${generation}-${o.id}`}>
              <th scope="row">{pick(o.name, lang)}</th>
              <td>{pick(o.designation, lang)}</td>
              <td>{dept ? pick(dept, lang) : o.department}</td>
              <td>{pick(officeName(o.office), lang)}</td>
              <td className={s.phone}>{HELPLINE} · {t("dir.ext", { ext: o.ext })}</td>
              <td className={s.actionsCell}><RowActions official={o} onView={onView} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
