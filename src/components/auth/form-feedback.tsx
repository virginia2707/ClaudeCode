import { Alert } from "@/components/ui/alert";
import type { FormState } from "@/lib/auth/schemas";

export function FormFeedback({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error) return <Alert tone="danger" live>{state.error}</Alert>;
  if (state.success) return <Alert tone="success" live>{state.success}</Alert>;
  return null;
}
