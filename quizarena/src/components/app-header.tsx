import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutAction } from "@/actions/auth";

/** Header that knows about the signed-in user (server component). */
export async function AppHeader() {
  const user = await getCurrentUser();
  return <SiteHeader user={user ? { name: user.name, role: user.role } : null} logoutAction={logoutAction} />;
}
