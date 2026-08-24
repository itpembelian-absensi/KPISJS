import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Manrope } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { getAppBranding } from "@/lib/branding";
import { getSessionUser } from "@/lib/session";
import "./globals.css";

const display = Manrope({
  variable: "--font-display",
  subsets: ["latin"],
});

const accent = Fraunces({
  variable: "--font-accent",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SJS KPI & IT Helpdesk",
  description:
    "Antrian tiket support IT SJS: assignment handler, SLA, durasi penyelesaian, dan repeat issue.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  const branding = getAppBranding();

  return (
    <html
      lang="id"
      data-theme={branding.themeId}
      className={`${display.variable} ${accent.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppShell
          user={user}
          logoUrl={branding.logoUrl}
          companyName={branding.companyName}
          appTitle={branding.appTitle}
          appTagline={branding.appTagline}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
