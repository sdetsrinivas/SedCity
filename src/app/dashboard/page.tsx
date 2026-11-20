import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getT } from "@/i18n/server";
import { Dashboard } from "@/modules/dashboard/Dashboard";
import { Greeting } from "@/modules/dashboard/Greeting";
import { ProfilePanel } from "@/modules/dashboard/ProfilePanel";
import { Preferences } from "@/modules/dashboard/Preferences";
import { ServiceUpdates, ServiceUpdatesSkeleton } from "@/modules/dashboard/ServiceUpdates";
import s from "@/modules/dashboard/Dashboard.module.css";

export const metadata: Metadata = { title: "My Dashboard" };

export default async function DashboardPage() {
  const { t } = await getT();
  return (
    <>
      <div className="page-head">
        <div className="container">
          <nav aria-label="Breadcrumb">
            <ol className="breadcrumb">
              <li><Link href="/">{t("nav.home")}</Link></li>
              <li aria-current="page">{t("dash.title")}</li>
            </ol>
          </nav>
          <Greeting />
        </div>
      </div>
      <div className="container">
        <div className={`page ${s.layout}`}>
          <div className={s.side}>
            <ProfilePanel />
            <Preferences />
            <section className="card" aria-labelledby="dash-updates-title">
              <div className="card-title"><h2 id="dash-updates-title">{t("dash.up.title")}</h2></div>
              <div className="card-body">
                <Suspense fallback={<ServiceUpdatesSkeleton label={t("dash.up.loading")} />}>
                  <ServiceUpdates />
                </Suspense>
              </div>
            </section>
          </div>
          <div className={s.main}>
            <Dashboard />
          </div>
        </div>
      </div>
    </>
  );
}
