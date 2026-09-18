import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { PasswordForm, ProfileForm } from "@/components/app/account-forms";
import { Pill } from "@/components/ui/pill";
import { guardPage } from "@/lib/auth/guards";
import { PLAN_LIMITS } from "@/lib/plans";
import type { Plan } from "@/lib/constants";
import { IconCheck } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const user = await guardPage(["TRAINER", "ADMIN"], "/app/settings");
  const plan = PLAN_LIMITS[user.plan as Plan] ?? PLAN_LIMITS.FREE;
  return (
    <>
      <PageHeader title="Paramètres" description="Votre profil, votre mot de passe et votre plan." />
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileForm firstName={user.firstName} lastName={user.lastName} email={user.email} />
        <PasswordForm />
        <section className="card p-5 lg:col-span-2" aria-labelledby="plan-h">
          <div className="flex items-center gap-3">
            <h2 id="plan-h" className="font-semibold">
              Plan
            </h2>
            <Pill tone="accent">{plan.label}</Pill>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-sm text-text-muted">
            <li className="flex gap-2"><IconCheck size={16} className="text-success mt-0.5" /> {plan.maxGames === null ? "Escape Games illimités" : `${plan.maxGames} Escape Games actifs`}</li>
            <li className="flex gap-2"><IconCheck size={16} className="text-success mt-0.5" /> {plan.maxSessionsPerMonth === null ? "Sessions illimitées" : `${plan.maxSessionsPerMonth} sessions par mois`}</li>
            <li className="flex gap-2"><IconCheck size={16} className="text-success mt-0.5" /> {plan.maxParticipantsPerSession} participants par session</li>
            <li className="flex gap-2"><IconCheck size={16} className={plan.ai ? "text-success mt-0.5" : "text-text-subtle mt-0.5"} /> Génération IA {plan.ai ? "incluse" : "(plan Pro)"}</li>
            <li className="flex gap-2"><IconCheck size={16} className={plan.advancedStats ? "text-success mt-0.5" : "text-text-subtle mt-0.5"} /> Statistiques avancées {plan.advancedStats ? "incluses" : "(plan Pro)"}</li>
            <li className="flex gap-2"><IconCheck size={16} className={plan.organizations ? "text-success mt-0.5" : "text-text-subtle mt-0.5"} /> Organisations {plan.organizations ? "incluses" : "(plan Business)"}</li>
          </ul>
          <p className="mt-3 text-xs text-text-subtle">Les changements de plan et la facturation arrivent après le MVP.</p>
        </section>
      </div>
    </>
  );
}
