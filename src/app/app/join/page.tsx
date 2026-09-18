import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreateOrganizationForm } from "@/components/app/create-organization-form";
import { Card } from "@/components/ui/card";
import { getActiveMembership, homeForRole, requireUser } from "@/lib/auth/current-user";
import type { OrgRole } from "@/lib/constants";

export const metadata: Metadata = { title: "Rejoindre une organisation" };

export default async function JoinPage() {
  const user = await requireUser();
  const membership = await getActiveMembership(user);
  if (membership) redirect(homeForRole(membership.role as OrgRole));
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="eyebrow">Bienvenue, {user.name}</p>
        <h1 className="h1 mt-2">Vous n&apos;appartenez encore à aucune organisation.</h1>
        <p className="lead mt-3">Deux possibilités : attendre l&apos;invitation de votre formateur, ou créer votre propre organisation pour concevoir des missions.</p>
      </div>
      <Card className="p-6">
        <h2 className="h3">Vous êtes apprenant</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Votre formateur vous enverra un lien d&apos;invitation. Ouvrez-le en étant connecté avec l&apos;adresse <span className="font-medium text-text">{user.email}</span> et vous rejoindrez
          automatiquement sa session.
        </p>
      </Card>
      <Card className="p-6">
        <h2 className="h3">Vous êtes formateur</h2>
        <p className="mt-2 text-sm text-text-secondary">Créez votre organisation : vous en serez administrateur et pourrez créer des missions, inviter des collègues et des apprenants.</p>
        <div className="mt-4">
          <CreateOrganizationForm />
        </div>
      </Card>
    </div>
  );
}
