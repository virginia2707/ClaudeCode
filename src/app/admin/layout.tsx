import { AppShell } from "@/components/app/app-shell";
import { guardPage } from "@/lib/auth/guards";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await guardPage(["ADMIN"], "/admin");
  return (
    <AppShell user={user} area="admin">
      {children}
    </AppShell>
  );
}
