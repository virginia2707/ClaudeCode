import { redirect } from "next/navigation";
import { getActiveMembership, homeForRole, requireUser } from "@/lib/auth/current-user";
import type { OrgRole } from "@/lib/constants";

export default async function AppIndex() {
  const user = await requireUser();
  const membership = await getActiveMembership(user);
  redirect(homeForRole((membership?.role as OrgRole) ?? null));
}
