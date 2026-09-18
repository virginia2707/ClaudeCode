import { AppShell } from "@/components/app/app-shell";
import { guardPage } from "@/lib/auth/guards";

export default async function TrainerLayout({ children }: LayoutProps<"/app">) {
  const user = await guardPage(["TRAINER", "ADMIN"], "/app");
  return (
    <AppShell user={user} area="trainer">
      {children}
    </AppShell>
  );
}
