/**
 * OTH-20: Office list on /directory/offices — a virtualized list in plain JavaScript, no framework.
 * React renders only an empty host <div>; everything inside is owned by this module.
 *
 * Only the rows in (or just around) the visible part of the scroll box exist in the DOM: a tall sizer
 * gives the box its full scroll height and a small pool of row elements is positioned over it. Row
 * elements are recycled by slot: pool[0] always shows the first rendered office, so after scrolling the
 * same element shows a different office. Row ids (ofl-<random>-<slot>) belong to the slot, not the office.
 *
 * Keyboard: the box is a listbox (tabindex=0, aria-activedescendant). Arrow keys, Home/End and
 * PageUp/PageDown move the active row (scrolling it into view); Enter or Space chooses it.
 */

const STYLE_ID = "ofl_styles";
const OVERSCAN = 3;
const CSS = `
.ofl_viewport{position:relative;height:var(--ofl-height,30rem);overflow-y:auto;overscroll-behavior:contain;outline:none}
.ofl_viewport:focus-visible{box-shadow:inset 0 0 0 3px var(--c-primary-soft)}
.ofl_sizer{position:relative;width:100%}
.ofl_probe{position:absolute;visibility:hidden;height:4.75rem;width:1px;pointer-events:none}
.ofl_row{position:absolute;left:0;right:0;box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) auto;align-content:center;gap:2px 12px;padding:0 20px;border-bottom:1px solid var(--c-border);cursor:pointer;color:var(--c-text)}
.ofl_row:hover{background:var(--c-surface-2)}
.ofl_row[aria-selected=true]{background:var(--c-primary-soft)}
.ofl_row[aria-selected=true] .ofl_title{color:var(--c-primary)}
.ofl_viewport:focus-visible .ofl_row.ofl_active{outline:2px solid var(--c-primary);outline-offset:-3px}
.ofl_title{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ofl_meta{grid-column:1;font-size:.85rem;color:var(--c-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ofl_dist{grid-column:2;grid-row:1/span 2;align-self:center;font-size:.85rem;font-weight:700;color:var(--c-primary);white-space:nowrap}
.ofl_empty{padding:28px 20px;margin:0;text-align:center;color:var(--c-muted)}
@media (max-width:600px){.ofl_row{padding:0 16px}}
`;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

/**
 * Rows to render for a scroll position: the visible ones plus OVERSCAN on each side.
 * @param {number} scrollTop @param {number} height @param {number} rowHeight @param {number} count
 * @returns {{ first: number, last: number }} inclusive; last < first when there is nothing to render
 */
export function visibleRange(scrollTop, height, rowHeight, count, overscan = OVERSCAN) {
  if (count <= 0 || rowHeight <= 0) return { first: 0, last: -1 };
  const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const last = Math.min(count - 1, Math.ceil((scrollTop + Math.max(height, rowHeight)) / rowHeight) - 1 + overscan);
  return { first, last };
}

/**
 * Scroll position that brings row `index` fully into view (unchanged when it already is).
 * @returns {number}
 */
export function scrollFor(index, scrollTop, height, rowHeight) {
  const top = index * rowHeight;
  if (top < scrollTop) return top;
  if (top + rowHeight > scrollTop + height) return top + rowHeight - height;
  return scrollTop;
}

/**
 * @typedef {{ id: string, title: string, meta: string, distance?: string }} OfficeRow
 * @typedef {{ items: OfficeRow[], selectedId: string | null, label: string, emptyText: string }} OfficeListState
 */

/**
 * @param {HTMLElement} host
 * @param {OfficeListState & { onSelect: (id: string) => void }} opts
 * @returns {{ update: (next: Partial<OfficeListState> & { resetScroll?: boolean }) => void, reveal: (id: string) => void, destroy: () => void }}
 */
export function mountOfficeList(host, opts) {
  ensureStyles();
  const uid = Math.random().toString(36).slice(2, 7);
  const state = { items: opts.items, selectedId: opts.selectedId, label: opts.label, emptyText: opts.emptyText };
  let active = -1;
  let rowHeight = 76;
  let frame = 0;
  /** @type {HTMLDivElement[]} */
  const pool = [];
  host.innerHTML = "";

  const viewport = document.createElement("div");
  viewport.className = "ofl_viewport";
  viewport.setAttribute("role", "listbox");
  viewport.tabIndex = 0;
  const sizer = document.createElement("div");
  sizer.className = "ofl_sizer";
  const probe = document.createElement("div");
  probe.className = "ofl_probe";
  probe.setAttribute("aria-hidden", "true");
  const empty = document.createElement("p");
  empty.className = "ofl_empty";
  viewport.append(probe, sizer);
  host.append(viewport, empty);

  const rowAt = (slot) => {
    let row = pool[slot];
    if (!row) {
      row = document.createElement("div");
      row.className = "ofl_row";
      row.id = `ofl-${uid}-${slot}`;
      row.setAttribute("role", "option");
      const title = document.createElement("span");
      title.className = "ofl_title";
      const meta = document.createElement("span");
      meta.className = "ofl_meta";
      const dist = document.createElement("span");
      dist.className = "ofl_dist";
      row.append(title, meta, dist);
      pool[slot] = row;
    }
    return row;
  };

  function render() {
    frame = 0;
    const { items } = state;
    rowHeight = probe.offsetHeight || rowHeight;
    viewport.setAttribute("aria-label", state.label);
    empty.textContent = state.emptyText;
    empty.hidden = items.length > 0;
    viewport.hidden = items.length === 0;
    sizer.style.height = `${items.length * rowHeight}px`;
    const { first, last } = visibleRange(viewport.scrollTop, viewport.clientHeight, rowHeight, items.length);
    let slot = 0;
    let activeId = "";
    for (let i = first; i <= last; i++, slot++) {
      const item = items[i];
      const row = rowAt(slot);
      row.style.top = `${i * rowHeight}px`;
      row.style.height = `${rowHeight}px`;
      row.dataset.index = String(i);
      row.setAttribute("aria-posinset", String(i + 1));
      row.setAttribute("aria-setsize", String(items.length));
      row.setAttribute("aria-selected", String(item.id === state.selectedId));
      row.classList.toggle("ofl_active", i === active);
      row.children[0].textContent = item.title;
      row.children[1].textContent = item.meta;
      row.children[2].textContent = item.distance ?? "";
      if (row.parentNode !== sizer) sizer.appendChild(row);
      if (i === active) activeId = row.id;
    }
    // Slots not needed for this scroll position leave the DOM (the pool keeps them for later).
    for (let s = slot; s < pool.length; s++) pool[s].remove();
    if (activeId) viewport.setAttribute("aria-activedescendant", activeId);
    else viewport.removeAttribute("aria-activedescendant");
  }

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  const moveTo = (index) => {
    if (!state.items.length) return;
    active = Math.max(0, Math.min(state.items.length - 1, index));
    viewport.scrollTop = scrollFor(active, viewport.scrollTop, viewport.clientHeight, rowHeight);
    render();
  };

  const choose = (index) => {
    const item = state.items[index];
    if (!item) return;
    active = index;
    state.selectedId = item.id;
    render();
    opts.onSelect(item.id);
  };

  const onClick = (e) => {
    const row = /** @type {HTMLElement} */ (e.target).closest(".ofl_row");
    if (row) choose(Number(row.dataset.index));
  };
  const onFocus = () => {
    if (active < 0 || active >= state.items.length) {
      const selected = state.items.findIndex((it) => it.id === state.selectedId);
      // Start on the chosen office if it is on screen, otherwise on the first row fully in view. Focus never
      // scrolls: it comes with the mousedown of a click, and moving the rows then would lose the click.
      const firstFull = Math.min(state.items.length - 1, Math.ceil(viewport.scrollTop / rowHeight));
      const inView = selected >= 0 && selected * rowHeight >= viewport.scrollTop && (selected + 1) * rowHeight <= viewport.scrollTop + viewport.clientHeight;
      active = inView ? selected : firstFull;
    }
    render();
  };
  const onKey = (e) => {
    const page = Math.max(1, Math.floor(viewport.clientHeight / rowHeight) - 1);
    const keys = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: state.items.length - 1, PageDown: active + page, PageUp: active - page };
    if (e.key in keys) {
      e.preventDefault();
      moveTo(keys[e.key]);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (active >= 0) choose(active);
    }
  };

  viewport.addEventListener("scroll", schedule, { passive: true });
  viewport.addEventListener("click", onClick);
  viewport.addEventListener("focus", onFocus);
  viewport.addEventListener("keydown", onKey);
  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
  resize?.observe(viewport);
  resize?.observe(probe);
  render();

  return {
    update(next) {
      const itemsChanged = next.items && next.items !== state.items;
      Object.assign(state, next);
      if (itemsChanged) {
        active = -1;
        if (next.resetScroll) viewport.scrollTop = 0;
      }
      render();
    },
    /** Scroll an office into view and make it the active row (when it is in the current list). */
    reveal(id) {
      const index = state.items.findIndex((it) => it.id === id);
      if (index < 0) return;
      active = index;
      const centred = index * rowHeight - (viewport.clientHeight - rowHeight) / 2;
      viewport.scrollTop = Math.max(0, Math.min(centred, state.items.length * rowHeight - viewport.clientHeight));
      render();
    },
    destroy() {
      if (frame) cancelAnimationFrame(frame);
      resize?.disconnect();
      viewport.removeEventListener("scroll", schedule);
      viewport.removeEventListener("click", onClick);
      viewport.removeEventListener("focus", onFocus);
      viewport.removeEventListener("keydown", onKey);
      host.innerHTML = "";
    },
  };
}
