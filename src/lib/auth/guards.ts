import "server-only";
import { forbidden, redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";
import type { Role } from "@/lib/constants";

/** À utiliser dans les layouts/pages : redirige vers /login ou renvoie 403 selon le rôle. */
export async function guardPage(roles: Role[], nextPath: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!roles.includes(user.role)) forbidden();
  return user;
}
