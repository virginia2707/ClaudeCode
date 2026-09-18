"use client";

import { useActionState } from "react";
import { setMemberStatusAction, updateMemberRoleAction } from "@/actions/org-actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { ORG_ROLES, type OrgRole } from "@/lib/constants";

const ROLE_LABEL: Record<OrgRole, string> = { ADMIN: "Administrateur", TRAINER: "Formateur", LEARNER: "Apprenant" };

export function MemberRowActions({ membershipId, role, status, isSelf, name }: { membershipId: string; role: OrgRole; status: string; isSelf: boolean; name: string }) {
  const [roleState, roleAction] = useActionState(updateMemberRoleAction, undefined);
  const [statusState, statusAction] = useActionState(setMemberStatusAction, undefined);
  const message = roleState?.error ?? roleState?.success ?? statusState?.error ?? statusState?.success;
  const isError = !!(roleState?.error ?? statusState?.error);
  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <form action={roleAction} className="flex items-center gap-2">
          <input type="hidden" name="membershipId" value={membershipId} />
          <label htmlFor={`role-${membershipId}`} className="sr-only">
            Rôle de {name}
          </label>
          <select id={`role-${membershipId}`} name="role" defaultValue={role} className="input !min-h-9 !w-auto !py-1 text-sm">
            {ORG_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <SubmitButton variant="secondary" size="sm" pendingLabel="…">
            Modifier
          </SubmitButton>
        </form>
        {!isSelf && (
          <form action={statusAction}>
            <input type="hidden" name="membershipId" value={membershipId} />
            <input type="hidden" name="status" value={status === "ACTIVE" ? "DISABLED" : "ACTIVE"} />
            <SubmitButton variant={status === "ACTIVE" ? "danger" : "secondary"} size="sm" pendingLabel="…">
              {status === "ACTIVE" ? "Désactiver" : "Réactiver"}
            </SubmitButton>
          </form>
        )}
      </div>
      {message && (
        <p role="status" className={`text-xs ${isError ? "text-danger" : "text-success"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
