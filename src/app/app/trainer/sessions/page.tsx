import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Sessions" };

export default async function SessionsPage() {
  await requirePermission("session:read");
  return (
    <div className="space-y-6">
      <h1 className="h1">Sessions</h1>
      <Card className="p-8 text-center">
        <p className="font-semibold">Aucune session pour l&apos;instant.</p>
        <p className="mt-1 text-sm text-text-secondary">Le lancement de sessions et le mode équipe arrivent en phase 14.</p>
      </Card>
    </div>
  );
}
