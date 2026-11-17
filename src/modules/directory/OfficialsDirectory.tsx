"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useT } from "@/i18n/client";
import {
  DEFAULT_QUERY, DIRECTORY_PAGE_SIZE, departmentById, fetchOfficials,
  type Official, type OfficialsPage, type OfficialsQuery, type SortKey,
} from "@/mock/endpoints/directory";
import { DepartmentCombobox } from "./DepartmentCombobox";
import { OfficialsTable } from "./OfficialsTable";
import { Pager } from "./Pager";
import { ExportButton } from "./ExportButton";
import { OfficialDetails } from "./OfficialDetails";
import s from "./Directory.module.css";

interface Shown extends OfficialsPage {
  /** HYD-04: the filter generation these rows were fetched for. */
  generation: number;
  /** The order these rows were fetched in (the header arrows follow the rows, not the request). */
  sort: OfficialsQuery["sort"];
  dir: OfficialsQuery["dir"];
}

/** Keep the applied filter in the address (?department=…&q=…) so the page can be bookmarked or shared. */
function writeFilterToUrl(q: OfficialsQuery) {
  const url = new URL(window.location.href);
  for (const [key, value] of [["department", q.department], ["q", q.q]] as const) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  window.history.replaceState(null, "", url);
}

/**
 * Officials directory: filters (DRP-04 department combobox, name/designation search), the sortable and
 * paginated table (TBL-02), icon-only row actions (BTN-02) and the CSV download (FIL-06).
 *
 * DYN-02: every page, sort or filter change asks the mock service again (DIRECTORY_PAGE, 800ms). Meanwhile
 * an overlay with a spinner covers the table and pager and takes the pointer events, while the previous
 * rows stay visible underneath it; the range text and pager also keep describing the previous rows until
 * the answer arrives. Sort and page changes are ignored while it is shown (a filter change is not: it
 * replaces the request in flight).
 *
 * HYD-04: the server renders the first page of the whole directory, whatever the address says. After
 * hydration the component reads ?department= and ?q= and, if present, applies them (overlay, then the
 * filtered rows under new keys).
 */
export function OfficialsDirectory({ initial }: { initial: OfficialsPage }) {
  const { t, lang } = useT();
  const [query, setQuery] = useState<OfficialsQuery>(DEFAULT_QUERY);
  const [shown, setShown] = useState<Shown>({ ...initial, generation: 0, sort: DEFAULT_QUERY.sort, dir: DEFAULT_QUERY.dir });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [details, setDetails] = useState<Official | null>(null);
  const [exportFailed, setExportFailed] = useState(false);
  const request = useRef(0);
  const generation = useRef(0);
  const langRef = useRef(lang);
  langRef.current = lang;

  const load = useCallback((next: OfficialsQuery, refilter: boolean) => {
    const id = ++request.current;
    const gen = refilter ? ++generation.current : generation.current;
    setQuery(next);
    setLoading(true);
    setFailed(false);
    fetchOfficials(next, langRef.current).then(
      (res) => {
        if (id !== request.current) return;
        setShown({ ...res, generation: gen, sort: next.sort, dir: next.dir });
        setQuery((q) => ({ ...q, page: res.page }));
        setLoading(false);
      },
      () => {
        if (id !== request.current) return;
        setLoading(false);
        setFailed(true);
      },
    );
  }, []);

  const applyFilter = (department: string, q: string) => {
    const next = { ...query, department, q, page: 0 };
    writeFilterToUrl(next);
    load(next, true);
  };

  // HYD-04: a filter in the address is applied only once the page has hydrated.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const department = params.get("department") ?? "";
    const q = (params.get("q") ?? "").trim();
    const dept = departmentById(department) ? department : "";
    if (!dept && !q) return;
    setSearch(q);
    load({ ...DEFAULT_QUERY, department: dept, q }, true);
  }, [load]);

  // Sorted by a text column: the order depends on the language, so ask again after switching.
  const firstLang = useRef(lang);
  useEffect(() => {
    if (lang === firstLang.current) return;
    firstLang.current = lang;
    if (query.sort) load(query, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const sortBy = (key: SortKey) => {
    if (loading) return;
    load({ ...query, sort: key, dir: query.sort === key && query.dir === "asc" ? "desc" : "asc", page: 0 }, false);
  };
  const goTo = (page: number) => {
    if (loading) return;
    load({ ...query, page }, false);
  };
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    applyFilter(query.department, search.trim());
  };
  const filtered = !!(query.department || query.q);

  const from = shown.page * DIRECTORY_PAGE_SIZE + 1;
  const to = shown.page * DIRECTORY_PAGE_SIZE + shown.rows.length;

  return (
    <>
      <div className={`card ${s.toolbar}`} role="group" aria-label={t("dir.filters")}>
        <DepartmentCombobox value={query.department} onChange={(d) => applyFilter(d, query.q)} />
        <form role="search" className={s.searchForm} onSubmit={onSearch}>
          <div className="field">
            <label htmlFor="dir-search">{t("dir.search")}</label>
            <input id="dir-search" className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary">{t("dir.searchBtn")}</button>
        </form>
        {filtered && (
          <button type="button" className={`link-btn ${s.clear}`} onClick={() => { setSearch(""); applyFilter("", ""); }}>
            {t("dir.clear")}
          </button>
        )}
      </div>

      <section className="card" aria-labelledby="dir-list-title">
        <div className={`card-title ${s.listHead}`}>
          <h2 id="dir-list-title">{t("dir.listTitle")}</h2>
          <div className={s.headActions}>
            <ExportButton query={query} onFailed={setExportFailed} />
          </div>
        </div>
        {exportFailed && <div className={`alert alert-error ${s.exportError}`} role="alert">{t("dir.exportError")}</div>}

        <div className={s.results} aria-busy={loading}>
          {failed ? (
            <div className={`alert alert-error ${s.failed}`} role="alert">
              <span>{t("dir.loadError")}</span>
              <button type="button" className="btn btn-outline" onClick={() => load(query, false)}>{t("dir.retry")}</button>
            </div>
          ) : shown.total === 0 ? (
            <p className={s.empty}>{t("dir.empty")}</p>
          ) : (
            <>
              <div className={s.tableWrap} role="region" aria-labelledby="dir-list-title" tabIndex={0}>
                <OfficialsTable
                  rows={shown.rows}
                  generation={shown.generation}
                  sort={shown.sort}
                  dir={shown.dir}
                  onSort={sortBy}
                  onView={setDetails}
                />
              </div>
              <div className={s.foot}>
                <p className={s.range} aria-live="polite">{t("dir.range", { from, to, total: shown.total })}</p>
                <Pager page={shown.page} pages={shown.pages} onPage={goTo} />
              </div>
            </>
          )}

          {/* DYN-02: covers the table and pager while a page is being fetched. */}
          {loading && (
            <div className={s.overlay}>
              <span className={s.overlayBox}>
                <span className={s.spinner} aria-hidden="true" />
                {t("common.loading")}
              </span>
            </div>
          )}
        </div>
      </section>

      <OfficialDetails official={details} onClose={() => setDetails(null)} />
    </>
  );
}
