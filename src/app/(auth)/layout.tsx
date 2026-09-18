import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div className="glow" aria-hidden="true" />
      <header className="container-x relative flex h-16 items-center">
        <Logo />
      </header>
      <main id="contenu" className="container-x relative flex flex-1 items-start justify-center py-10 sm:items-center">
        {children}
      </main>
      <footer className="container-x relative py-6 text-center text-xs text-text-muted">© {new Date().getFullYear()} MissionIA</footer>
    </div>
  );
}
