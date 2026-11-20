import type { Metadata } from "next";
import { randomBytes } from "node:crypto";
import { getT } from "@/i18n/server";
import { PageHead } from "@/components/PageHead";
import { BookingService } from "@/modules/bookings/BookingService";
import s from "@/modules/bookings/Bookings.module.css";

export const metadata: Metadata = { title: "Book a Hall or Park" };

/** A fresh id prefix for every request (DYN-06): a letter, then six random base-36 characters. */
function idPrefix(): string {
  const n = randomBytes(5).readUIntBE(0, 5);
  return `${"bcdfghjkmnpqrstvwxz"[n % 19]}${Math.floor(n / 19).toString(36).padStart(6, "0").slice(-6)}`;
}

export default async function BookingsPage() {
  const { t } = await getT();
  return (
    <>
      <PageHead title={t("svc.booking")} trail={[{ label: t("nav.bookings") }]} intro={t("bk.intro")} />
      <div className="container">
        <div className={`page ${s.layout}`}>
          <BookingService uid={idPrefix()} />
          <aside className={`card ${s.aside}`}>
            <div className="card-title"><h2>{t("bk.asideTitle")}</h2></div>
            <div className="card-body">
              <ul>
                <li>{t("bk.aside1")}</li>
                <li>{t("bk.aside2")}</li>
                <li>{t("bk.aside3")}</li>
                <li>{t("bk.aside4")}</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
