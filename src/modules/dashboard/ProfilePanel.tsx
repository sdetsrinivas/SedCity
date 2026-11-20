"use client";
import { useEffect, useState, type DetailedHTMLProps, type HTMLAttributes } from "react";
import { useT } from "@/i18n/client";
import { useSession } from "@/lib/useSession";
import type { Session } from "@/lib/session";
import { contactEmail } from "@/mock/endpoints/dashboard";
import { defineProfileCard } from "./profileCardElement";
import { ContactForm } from "./ContactForm";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "amc-profile-card": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & { initials?: string; "status-label"?: string };
    }
  }
}

const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

/** My profile (signed-in citizens only): `<amc-profile-card>` (SHD-04) around the contact form (TXT-08). */
export function ProfilePanel() {
  const { session } = useSession();
  useEffect(defineProfileCard, []);
  if (session?.role !== "citizen") return null;
  return <Card session={session} />;
}

function Card({ session }: { session: Session }) {
  const { t, lang } = useT();
  const [email, setEmail] = useState(session.email);
  useEffect(() => setEmail(contactEmail(session)), [session]);
  return (
    <section aria-label={t("dash.pf.title")}>
      <amc-profile-card id="profile-card" initials={initialsOf(session.name)} status-label={t("dash.pf.verified")}>
        <h2 slot="name">{lang === "ta" ? session.nameTa : session.name}</h2>
        <p slot="meta">{session.ward}</p>
        <ContactForm session={session} email={email} onSaved={setEmail} />
      </amc-profile-card>
    </section>
  );
}
