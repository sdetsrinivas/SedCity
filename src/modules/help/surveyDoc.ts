/**
 * The documents shown in the survey's inner frame (FRM-03). The frame has no `src`: each document is an
 * HTML string written to its `srcdoc` attribute, so every change of view (loading → questions → thank you)
 * re-navigates the frame to a new document. Pure functions, no DOM needed to build them.
 */

export const SURVEY_SERVICES = ["water", "propertyTax", "electricity", "birth", "trade", "grievance", "booking", "other"] as const;
export type SurveyService = (typeof SURVEY_SERVICES)[number];
export const RATINGS = [5, 4, 3, 2, 1] as const;

export type SurveyView =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "form"; sending?: boolean; failed?: boolean }
  | { kind: "thanks"; ref: string };

/** The words used in the inner documents, already translated. */
export interface SurveyWords {
  questionsTitle: string;
  loading: string;
  loadError: string;
  retry: string;
  service: string;
  servicePick: string;
  services: Record<SurveyService, string>;
  rating: string;
  ratings: Record<(typeof RATINGS)[number], string>;
  comments: string;
  commentsHint: string;
  submit: string;
  sending: string;
  needService: string;
  needRating: string;
  sendError: string;
  thanksTitle: string;
  thanksRef: string;
  thanksBody: string;
}

export interface SurveyAnswer {
  service: SurveyService | "";
  rating: number | null;
  comments: string;
}

export const COMMENTS_MAX = 500;

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Which answers are missing (comments are optional). */
export function surveyProblems(a: SurveyAnswer): { service: boolean; rating: boolean } {
  return { service: !SURVEY_SERVICES.includes(a.service as SurveyService), rating: !RATINGS.includes(a.rating as 5) };
}

/** Reads the questions form of the inner document. */
export function readSurveyForm(form: HTMLFormElement): SurveyAnswer {
  const data = new FormData(form);
  const rating = Number(data.get("rating"));
  return {
    service: String(data.get("service") ?? "") as SurveyService | "",
    rating: Number.isInteger(rating) && rating > 0 ? rating : null,
    comments: String(data.get("comments") ?? "").slice(0, COMMENTS_MAX),
  };
}

// The inner document cannot use the portal's stylesheet or fonts: it carries its own, with the portal's colours.
const STYLE = `
:root{--bg:#ffffff;--surface:#f0ede6;--border:#d9d3c7;--text:#1d2430;--muted:#5b6474;--primary:#0d4a6b;--primary-ink:#ffffff;--danger:#b42318;--danger-soft:#fdecea;--green:#2f7a3d;--green-soft:#e1f0e3;--focus:#f2b632;color-scheme:light}
html[data-theme="dark"]{--bg:#19212b;--surface:#212b37;--border:#33404f;--text:#e7ebf0;--muted:#9aa6b4;--primary:#5fb0d9;--primary-ink:#0a1a24;--danger:#f97066;--danger-soft:#3b1a17;--green:#6cc27b;--green-soft:#1c3322;color-scheme:dark}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--text);font:16px/1.55 "Noto Sans","Noto Sans Tamil",system-ui,-apple-system,"Segoe UI",sans-serif}
body{padding:4px 2px 8px}
h2{font-size:1.15rem;margin:0 0 6px}
p{margin:0 0 8px}
.muted{color:var(--muted);font-size:.9rem}
fieldset{border:1px solid var(--border);border-radius:6px;margin:0 0 14px;padding:12px 14px}
legend{font-weight:700;padding:0 4px}
label{cursor:pointer}
.field{display:flex;flex-direction:column;gap:6px;margin:0 0 14px}
.field>label{font-weight:700}
select,textarea{font:inherit;color:var(--text);background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px 10px;width:100%}
textarea{min-height:96px;resize:vertical}
.choices{display:flex;flex-direction:column;gap:6px}
.choices label{display:flex;align-items:center;gap:8px}
input[type=radio]{width:18px;height:18px;accent-color:var(--primary);margin:0}
:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
.error{color:var(--danger);font-weight:600;font-size:.92rem;margin:6px 0 0}
.alert{border:1px solid var(--danger);background:var(--danger-soft);color:var(--text);border-radius:6px;padding:10px 12px;margin:0 0 12px}
.ok{border:1px solid var(--green);background:var(--green-soft);border-radius:6px;padding:16px}
.ref{font-weight:700;font-family:ui-monospace,Menlo,Consolas,monospace}
button{font:inherit;font-weight:700;border-radius:6px;padding:10px 18px;cursor:pointer;border:1px solid var(--primary);background:var(--primary);color:var(--primary-ink)}
button:disabled{opacity:.65;cursor:progress}
.outline{background:transparent;color:var(--primary)}
.wait{display:flex;align-items:center;gap:10px;color:var(--muted);font-weight:600;padding:24px 4px}
.spin{width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:s .8s linear infinite}
@keyframes s{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.spin{animation:none}}
`;

function page(lang: string, theme: string, view: SurveyView["kind"], title: string, body: string): string {
  return `<!doctype html><html lang="${escapeHtml(lang)}" data-theme="${theme === "dark" ? "dark" : "light"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>${STYLE}</style></head><body data-view="${view}">${body}</body></html>`;
}

function formBody(w: SurveyWords, v: { sending?: boolean; failed?: boolean }): string {
  const e = escapeHtml;
  const options = SURVEY_SERVICES.map((id) => `<option value="${id}">${e(w.services[id])}</option>`).join("");
  const radios = RATINGS.map((n) => `<label><input type="radio" name="rating" value="${n}"> ${e(w.ratings[n])}</label>`).join("");
  return `<form id="survey" novalidate>
${v.failed ? `<div class="alert" role="alert">${e(w.sendError)}</div>` : ""}
<div class="field"><label for="service">${e(w.service)}</label>
<select id="service" name="service" aria-describedby="service-error"><option value="">${e(w.servicePick)}</option>${options}</select>
<p class="error" id="service-error" role="alert" hidden>${e(w.needService)}</p></div>
<fieldset aria-describedby="rating-error"><legend>${e(w.rating)}</legend><div class="choices">${radios}</div>
<p class="error" id="rating-error" role="alert" hidden>${e(w.needRating)}</p></fieldset>
<div class="field"><label for="comments">${e(w.comments)}</label>
<textarea id="comments" name="comments" maxlength="${COMMENTS_MAX}" aria-describedby="comments-hint"></textarea>
<span class="muted" id="comments-hint">${e(w.commentsHint)}</span></div>
<button type="submit"${v.sending ? " disabled" : ""}>${e(v.sending ? w.sending : w.submit)}</button>
</form>`;
}

/** The complete HTML document for one view of the inner frame. */
export function surveyDocument(view: SurveyView, w: SurveyWords, lang: string, theme: string): string {
  const e = escapeHtml;
  switch (view.kind) {
    case "loading":
      return page(lang, theme, "loading", w.questionsTitle, `<div class="wait" role="status"><span class="spin" aria-hidden="true"></span>${e(w.loading)}</div>`);
    case "error":
      return page(lang, theme, "error", w.questionsTitle, `<div class="alert" role="alert"><p>${e(w.loadError)}</p><button type="button" class="outline" id="retry">${e(w.retry)}</button></div>`);
    case "form":
      return page(lang, theme, "form", w.questionsTitle, formBody(w, view));
    case "thanks":
      return page(lang, theme, "thanks", w.thanksTitle, `<div class="ok" role="status"><h2>${e(w.thanksTitle)}</h2><p>${e(w.thanksRef).replace(e("{ref}"), `<span class="ref">${e(view.ref)}</span>`)}</p><p class="muted">${e(w.thanksBody)}</p></div>`);
  }
}
