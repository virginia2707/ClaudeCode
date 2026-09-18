import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "EscapeClass — Transformez vos formations en missions",
    template: "%s · EscapeClass",
  },
  description:
    "Créez des escape games pédagogiques interactifs et transformez vos cours en expériences d'apprentissage mémorables, conçues pour la formation professionnelle.",
  applicationName: "EscapeClass",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "EscapeClass — Transformez vos formations en missions",
    description: "Escape games pédagogiques numériques pour la formation professionnelle.",
    type: "website",
    locale: "fr_FR",
  },
};

export const viewport: Viewport = {
  themeColor: "#090c14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
