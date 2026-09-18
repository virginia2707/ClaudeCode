import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME, TAGLINE } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "QuizArena transforme vos QCM en expériences pédagogiques interactives avec classement en temps réel, défis, bonus et podium final.",
  applicationName: APP_NAME,
};

export const viewport: Viewport = {
  themeColor: "#0b0e14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="arena-bg">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-ink"
        >
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
