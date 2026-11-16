import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Noto_Sans, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "@/components/layout/Providers";
import { Chrome } from "@/components/layout/Chrome";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { SessionWatcher } from "@/components/layout/SessionWatcher";
import { KeyboardShortcuts } from "@/components/layout/KeyboardShortcuts";
import { getLang } from "@/i18n/server";

const sans = Noto_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-tamil", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Astheenapuram Municipal Corporation – Citizen Services Portal", template: "%s | AMC Citizen Services" },
  description: "Official citizen services portal of Astheenapuram Municipal Corporation: bills, taxes, certificates, grievances and bookings.",
  icons: { icon: "/brand/seal.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  const theme = (await cookies()).get("amc_theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang={lang} data-theme={theme} className={`${sans.variable} ${tamil.variable}`}>
      <body>
        <Providers lang={lang}>
          <Chrome
            header={<Header theme={theme} />}
            footer={<Footer />}
            extras={<><CookieConsent /><SessionWatcher /><KeyboardShortcuts /></>}
          >
            {children}
          </Chrome>
        </Providers>
      </body>
    </html>
  );
}
