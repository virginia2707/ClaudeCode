import type { Metadata } from "next";
import { acceptInvitationAction } from "@/actions/org-actions";
import { RegisterForm } from "@/components/auth/register-form";
import { SubmitButton } from "@/components/auth/submit-button";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Invitation", robots: { index: false } };

const ROLE_LABEL: Record<string, string> = { ADMIN: "administrateur", TRAINER: "formateur", LEARNER: "apprenant" };

export default async function InvitePage({ params, searchParams }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const invitation = await prisma.invitation.findUnique({ where: { token }, include: { organization: { select: { name: true } } } });
  const invalid = !invitation || !!invitation.acceptedAt || invitation.expiresAt < new Date();

  if (invalid) {
    return (
      <Card variant="elevated" className="w-full max-w-md p-8 text-center">
        <p className="eyebrow">Invitation</p>
        <h1 className="h2 mt-2">Invitation invalide ou expirée</h1>
        <p className="mt-3 text-sm text-text-secondary">Demandez à votre formateur ou administrateur de vous envoyer un nouveau lien.</p>
        <ButtonLink href="/login" variant="secondary" className="mt-6">
          Aller à la connexion
        </ButtonLink>
      </Card>
    );
  }

  const user = await getCurrentUser();
  const roleLabel = ROLE_LABEL[invitation.role] ?? invitation.role.toLowerCase();

  return (
    <Card variant="elevated" className="w-full max-w-lg p-6 sm:p-8">
      <p className="eyebrow">Invitation</p>
      <h1 className="h2 mt-2">Rejoindre {invitation.organization.name}</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Vous êtes invité·e en tant que <span className="font-semibold text-text">{roleLabel}</span>.
      </p>
      {sp.error === "email" && (
        <Alert tone="danger" className="mt-4">
          Cette invitation est destinée à {invitation.email}. Vous êtes connecté·e avec {user?.email}.
        </Alert>
      )}
      <div className="mt-6">
        {user ? (
          user.email === invitation.email ? (
            <form action={acceptInvitationAction} className="space-y-3">
              <input type="hidden" name="token" value={token} />
              <SubmitButton className="w-full" size="lg" pendingLabel="Un instant…">
                Accepter l&apos;invitation
              </SubmitButton>
            </form>
          ) : (
            <Alert tone="warning">
              Connectez-vous avec l&apos;adresse {invitation.email} pour accepter cette invitation.
            </Alert>
          )
        ) : (
          <RegisterForm invite={{ token, email: invitation.email, organizationName: invitation.organization.name, role: roleLabel }} />
        )}
      </div>
    </Card>
  );
}
