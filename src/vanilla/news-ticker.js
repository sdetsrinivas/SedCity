/**
 * OTH-18: Latest-updates ticker — plain JavaScript, no framework.
 * React only renders an empty host <div>; everything inside is owned by this module.
 * DOM conventions differ from the rest of the site on purpose: snake_case classes,
 * generated ids (tkr-<random>-<n>), state kept in data-* attributes, injected <style>.
 * Items are rendered twice so the CSS marquee loops seamlessly (each headline appears 2× in the DOM).
 */

const STYLE_ID = "tkr_styles";
const CSS = `
.tkr_wrap{display:flex;align-items:stretch;background:var(--c-accent-soft);border-bottom:1px solid var(--c-border);font-size:.9rem;overflow:hidden}
.tkr_label{flex-shrink:0;display:flex;align-items:center;padding:0 14px;background:var(--c-accent);color:#fff;font-weight:700;text-transform:uppercase;letter-spacing:.05em;font-size:.75rem}
.tkr_viewport{flex:1;overflow:hidden;position:relative;mask-image:linear-gradient(90deg,transparent,#000 24px,#000 calc(100% - 24px),transparent)}
.tkr_track{display:inline-flex;gap:48px;white-space:nowrap;padding:9px 0;animation:tkr_scroll var(--tkr-duration,60s) linear infinite}
.tkr_wrap[data-state=paused] .tkr_track{animation-play-state:paused}
.tkr_item{color:var(--c-text);text-decoration:none}
.tkr_item:hover{text-decoration:underline}
.tkr_item::before{content:"◆";color:var(--c-accent);margin-right:10px;font-size:.7em;vertical-align:middle}
.tkr_toggle{flex-shrink:0;border:0;border-left:1px solid var(--c-border);background:transparent;color:var(--c-text);padding:0 12px;cursor:pointer;font:inherit;font-size:.8rem}
@keyframes tkr_scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
`;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

/**
 * @param {HTMLElement} host
 * @param {{ label: string, pauseText: string, playText: string, items: { text: string, href: string }[] }} opts
 * @returns {() => void} destroy
 */
export function mountTicker(host, opts) {
  ensureStyles();
  const uid = Math.random().toString(36).slice(2, 7);
  host.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "tkr_wrap";
  wrap.setAttribute("data-state", "running");

  const label = document.createElement("div");
  label.className = "tkr_label";
  label.textContent = opts.label;

  const viewport = document.createElement("div");
  viewport.className = "tkr_viewport";

  const track = document.createElement("div");
  track.className = "tkr_track";
  track.style.setProperty("--tkr-duration", `${Math.max(30, opts.items.length * 14)}s`);

  let n = 0;
  for (let copy = 0; copy < 2; copy++) {
    for (const item of opts.items) {
      const a = document.createElement("a");
      a.className = "tkr_item";
      a.id = `tkr-${uid}-${n++}`;
      a.href = item.href;
      a.textContent = item.text;
      if (copy === 1) a.setAttribute("aria-hidden", "true"), a.setAttribute("tabindex", "-1");
      track.appendChild(a);
    }
  }
  viewport.appendChild(track);

  const toggle = document.createElement("button");
  toggle.className = "tkr_toggle";
  toggle.type = "button";
  toggle.textContent = opts.pauseText;

  const setState = (state) => {
    wrap.setAttribute("data-state", state);
    toggle.textContent = state === "paused" ? opts.playText : opts.pauseText;
  };
  let pinned = false;
  const onToggle = () => {
    pinned = wrap.getAttribute("data-state") === "running";
    setState(pinned ? "paused" : "running");
  };
  const onEnter = () => setState("paused");
  const onLeave = () => !pinned && setState("running");

  toggle.addEventListener("click", onToggle);
  viewport.addEventListener("mouseenter", onEnter);
  viewport.addEventListener("mouseleave", onLeave);

  wrap.append(label, viewport, toggle);
  host.appendChild(wrap);

  return () => {
    toggle.removeEventListener("click", onToggle);
    viewport.removeEventListener("mouseenter", onEnter);
    viewport.removeEventListener("mouseleave", onLeave);
    host.innerHTML = "";
  };
}
