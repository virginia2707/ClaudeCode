import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "MissionIA — Transformez vos cours en missions professionnelles",
    template: "%s · MissionIA",
  },
  description:
    "Avec MissionIA, vos apprenants apprennent en résolvant des problèmes réels, en prenant des décisions et en produisant des livrables.",
  applicationName: "MissionIA",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "MissionIA",
    title: "MissionIA — Transformez vos cours en missions professionnelles",
    description:
      "Plateforme SaaS qui transforme un cours en mission professionnelle : briefing, décisions, conséquences, livrables, feedback et bilan de compétences.",
  },
};

export const viewport: Viewport = {
  themeColor: "#090d16",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a href="#contenu" className="skip-link">
          Aller au contenu principal
        </a>
        {children}
      </body>
    </html>
  );
}
