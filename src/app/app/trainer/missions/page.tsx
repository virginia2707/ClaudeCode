import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Missions" };

export default async function MissionsPage() {
  await requirePermission("mission:read");
  return (
    <div className="space-y-6">
      <h1 className="h1">Missions</h1>
      <Card className="p-8 text-center">
        <p className="font-semibold">Aucune mission pour l&apos;instant.</p>
        <p className="mt-1 text-sm text-text-secondary">La création et le Mission Builder sont développés en phases 4 et 5.</p>
      </Card>
    </div>
  );
}
