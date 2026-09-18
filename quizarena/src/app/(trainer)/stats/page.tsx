import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Statistiques" };

// Placeholder — statistics arrive in Phase 10.
export default function StatsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Statistiques</h1>
      <EmptyState title="Les statistiques arrivent après les premières parties" description="Chaque partie terminée produira un rapport détaillé." />
    </div>
  );
}
