"use client";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { RequireRole } from "@/modules/auth/RequireRole";
import type { Session } from "@/lib/session";
import { fetchDashboard, type DashboardData } from "@/mock/endpoints/dashboard";
import { WidgetBoard } from "./WidgetBoard";
import { Notifications } from "./Notifications";
import { Applications } from "./Applications";
import { Payments } from "./Payments";
import { Documents } from "./Documents";

/** The signed-in citizen's cards (notifications, applications, payments, documents) in the order they chose. */
export function Dashboard() {
  return <RequireRole role="citizen">{(s) => <Cards session={s} />}</RequireRole>;
}

function Cards({ session }: { session: Session }) {
  const { t } = useT();
  const [data, setData] = useState<DashboardData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // DYN-03: every card renders its skeleton rows until this SKELETON call returns.
  useEffect(() => {
    let live = true;
    setData(null);
    setFailed(false);
    fetchDashboard(session).then((d) => { if (live) setData(d); }, () => { if (live) setFailed(true); });
    return () => { live = false; };
    // Refetch only for another citizen, not for a refreshed copy of the same session.
  }, [session.username, session.mobile, attempt]);

  if (failed) {
    return (
      <div className="alert alert-error" role="alert">
        {t("dash.error")} <button type="button" className="link-btn" onClick={() => setAttempt((n) => n + 1)}>{t("bk.retry")}</button>
      </div>
    );
  }

  return (
    <WidgetBoard
      username={session.username}
      render={(id, handle) => {
        switch (id) {
          case "notifications": return <Notifications username={session.username} notices={data?.notices ?? null} handle={handle} />;
          case "applications": return <Applications apps={data?.applications ?? null} handle={handle} />;
          case "payments": return <Payments payments={data?.payments ?? null} handle={handle} />;
          case "documents": return <Documents username={session.username} docs={data?.docs ?? null} handle={handle} />;
        }
      }}
    />
  );
}
