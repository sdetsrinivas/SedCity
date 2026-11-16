import type { Metadata } from "next";
import { notFound } from "next/navigation";

const PAGES: Record<string, { title: string; body: string[] }> = {
  terms: { title: "Terms of Use", body: [
    "This portal is owned and operated by Astheenapuram Municipal Corporation (AMC). By using it you agree to provide accurate information in every application and payment.",
    "Applications submitted through the portal are processed under the Astheenapuram Municipal Corporation Act and the rules in force at the time of processing.",
    "AMC may suspend any account that is used to submit false information or to interfere with the operation of the portal.",
  ] },
  privacy: { title: "Privacy Policy", body: [
    "AMC collects only the information required to deliver the service you request. Your Astheen ID and mobile number are used to link your civic records.",
    "Essential cookies keep you signed in and remember your language and display preferences. Analytics cookies are used only if you accept them.",
    "Your information is not shared with third parties except where required by law.",
  ] },
  accessibility: { title: "Accessibility Statement", body: [
    "AMC is committed to making this portal accessible to all citizens, including persons with disabilities.",
    "Text size controls and a dark theme are available at the top of every page. Content is available in English and Tamil.",
    "If you face difficulty using any part of the portal, call the helpline 155 2026.",
  ] },
  rti: { title: "Right to Information", body: [
    "Requests under the Right to Information Act may be submitted to the Public Information Officer, Ripon Mahal, Kalaivani Square, Astheenapuram 600 901.",
    "The application fee is ₹10, payable by postal order, demand draft or at any AMC cash counter.",
  ] },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: PAGES[slug]?.title ?? "Information" };
}

export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) notFound();
  return (
    <div className="container page" style={{ maxWidth: 820 }}>
      <h1>{page.title}</h1>
      {page.body.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
    </div>
  );
}
