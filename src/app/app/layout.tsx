import { AppShell } from "@/components/app/app-shell";
import { getActiveMembership, requireUser } from "@/lib/auth/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const membership = await getActiveMembership(user);
  return (
    <AppShell user={user} membership={membership}>
      {children}
    </AppShell>
  );
}
