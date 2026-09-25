import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" tabIndex={-1} className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Logo className="mb-8 text-xl" />
      <div className="card w-full max-w-md p-6 sm:p-8">{children}</div>
    </main>
  );
}
