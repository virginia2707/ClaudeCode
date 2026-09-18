import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Mes missions" };

export default async function LearnerDashboard() {
  const { user, membership } = await requirePermission("progress:play");
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">{membership.organization.name}</p>
        <h1 className="h1 mt-2">Bonjour {user.name.split(" ")[0]}.</h1>
        <p className="mt-2 text-text-secondary">Vos missions apparaîtront ici dès que votre formateur ouvrira une session.</p>
      </div>
      <Card className="p-8 text-center">
        <p className="font-semibold">Aucune mission en cours.</p>
        <p className="mt-1 text-sm text-text-secondary">Le parcours apprenant est développé en phase 11.</p>
      </Card>
    </div>
  );
}
