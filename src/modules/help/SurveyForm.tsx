"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { loadSurveyQuestions, submitSurvey } from "@/mock/endpoints/help";
import { RATINGS, SURVEY_SERVICES, readSurveyForm, surveyDocument, surveyProblems, type SurveyView, type SurveyWords } from "./surveyDoc";
import s from "./Survey.module.css";

type Theme = "light" | "dark";

/** The theme of the page around this frame (or of this document when opened on its own). */
function hostTheme(): Theme {
  let root = document.documentElement;
  try {
    if (window.parent !== window) root = window.parent.document.documentElement;
  } catch {
    /* not same-origin: keep our own */
  }
  return root.dataset.theme === "dark" ? "dark" : "light";
}

/**
 * The survey document shown in the outer frame of /help/survey (FRM-02: the page's frame holds this
 * document, which holds a second frame).
 * FRM-03: the questions are in an inner <iframe> with `srcdoc` and no `src`. It starts with a “Loading the
 * questions…” document; when SURVEY_INNER (2s) resolves its `srcdoc` is replaced with the form, and after
 * sending with the thank-you document, so the same frame element is re-navigated each time. This document
 * reads the form directly (same origin), keeps both frames as tall as their content and follows the page's
 * theme switch in place.
 */
export function SurveyForm({ initialTheme }: { initialTheme: Theme }) {
  const { t, lang } = useT();
  const [view, setView] = useState<SurveyView>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const inner = useRef<HTMLIFrameElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const sending = useRef(false);

  const words = useMemo<SurveyWords>(
    () => ({
      questionsTitle: t("survey.questionsTitle"),
      loading: t("survey.loading"),
      loadError: t("survey.loadError"),
      retry: t("survey.retry"),
      service: t("survey.service"),
      servicePick: t("survey.servicePick"),
      services: Object.fromEntries(SURVEY_SERVICES.map((id) => [id, t(`survey.svc.${id}`)])) as SurveyWords["services"],
      rating: t("survey.rating"),
      ratings: Object.fromEntries(RATINGS.map((n) => [n, t(`survey.rate.${n}`)])) as SurveyWords["ratings"],
      comments: t("survey.comments"),
      commentsHint: t("survey.commentsHint"),
      submit: t("survey.submit"),
      sending: t("survey.sending"),
      needService: t("survey.needService"),
      needRating: t("survey.needRating"),
      sendError: t("survey.sendError"),
      thanksTitle: t("survey.thanksTitle"),
      thanksRef: t("survey.thanksRef", { ref: "{ref}" }),
      thanksBody: t("survey.thanksBody"),
    }),
    [t],
  );

  // The theme is read when the document is built; later switches are applied in place (no re-navigation).
  const themeAtBuild = useRef(theme);
  themeAtBuild.current = theme;
  const srcDoc = useMemo(() => surveyDocument(view, words, lang, themeAtBuild.current), [view, words, lang]);

  // FRM-03: the questions arrive only after SURVEY_INNER.
  useEffect(() => {
    let cancelled = false;
    setView({ kind: "loading" });
    loadSurveyQuestions().then(
      () => !cancelled && setView({ kind: "form" }),
      () => !cancelled && setView({ kind: "error" }),
    );
    return () => { cancelled = true; };
  }, [attempt]);

  // Follow the page's theme switch: this document and the inner one are recoloured without reloading.
  useEffect(() => {
    setTheme(hostTheme());
    if (window.parent === window) return;
    let target: HTMLElement;
    try {
      target = window.parent.document.documentElement;
    } catch {
      return;
    }
    const mo = new MutationObserver(() => setTheme(hostTheme()));
    mo.observe(target, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const doc = inner.current?.contentDocument;
    if (doc?.documentElement) doc.documentElement.dataset.theme = theme;
  }, [theme]);

  // Keep the page's frame as tall as this document.
  useEffect(() => {
    const host = window.frameElement as HTMLIFrameElement | null;
    const el = root.current;
    if (!host || !el) return;
    const ro = new ResizeObserver(() => { host.style.height = `${Math.ceil(el.getBoundingClientRect().height)}px`; });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const send = useCallback(
    async (form: HTMLFormElement) => {
      if (sending.current) return;
      const answer = readSurveyForm(form);
      const problems = surveyProblems(answer);
      const doc = form.ownerDocument;
      doc.getElementById("service-error")!.hidden = !problems.service;
      doc.getElementById("rating-error")!.hidden = !problems.rating;
      if (problems.service) form.querySelector<HTMLElement>("#service")?.setAttribute("aria-invalid", "true");
      else form.querySelector<HTMLElement>("#service")?.removeAttribute("aria-invalid");
      if (problems.service || problems.rating) {
        (problems.service ? form.querySelector<HTMLElement>("#service") : form.querySelector<HTMLElement>("input[name=rating]"))?.focus();
        return;
      }
      sending.current = true;
      const button = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
      button.disabled = true;
      button.textContent = words.sending;
      doc.querySelector(".alert")?.remove();
      try {
        const saved = await submitSurvey({ service: answer.service, rating: answer.rating!, comments: answer.comments, lang });
        setView({ kind: "thanks", ref: saved.ref });
      } catch {
        button.disabled = false;
        button.textContent = words.submit;
        const alert = doc.createElement("div");
        alert.className = "alert";
        alert.setAttribute("role", "alert");
        alert.textContent = words.sendError;
        form.prepend(alert);
      } finally {
        sending.current = false;
      }
    },
    [lang, words],
  );

  // Each new inner document: wire it up, apply the current theme and size the frame to it.
  const onInnerLoad = () => {
    const frame = inner.current;
    const doc = frame?.contentDocument;
    const win = frame?.contentWindow as (Window & typeof globalThis) | null;
    if (!frame || !doc?.body || !win) return;
    doc.documentElement.dataset.theme = themeAtBuild.current;
    // The body's own height (the document's scrollHeight never drops below the frame's current height).
    const fit = () => { frame.style.height = `${Math.ceil(doc.body.getBoundingClientRect().height)}px`; };
    fit();
    new win.ResizeObserver(fit).observe(doc.body);
    // The thank-you is much shorter than the form: bring it into view on the page.
    if (doc.body.dataset.view === "thanks") frame.scrollIntoView({ block: "center" });
    const form = doc.getElementById("survey") as HTMLFormElement | null;
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      void send(form);
    });
    doc.getElementById("retry")?.addEventListener("click", () => setAttempt((n) => n + 1));
  };

  return (
    <div ref={root} className={s.frameDoc}>
      <header className={s.frameHead}>
        <img src="/brand/seal.svg" alt="" width={36} height={36} />
        <div>
          <h1>{t("survey.frameHeading")}</h1>
          <p>{t("survey.frameNote")}</p>
        </div>
      </header>
      {/* FRM-03: srcdoc, no src; re-navigated for each view. */}
      <iframe ref={inner} title={t("survey.questionsTitle")} srcDoc={srcDoc} onLoad={onInnerLoad} className={s.inner} />
    </div>
  );
}
