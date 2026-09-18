// Filtrage minimal avant tout envoi à un fournisseur externe.
// Phase 1 : masquage des identifiants directs (emails, téléphones, IBAN).
// Phases suivantes : dictionnaire de pseudonymisation réversible par job.

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE = /(?:\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}/g;
const IBAN = /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}\b/g;

export function redactPII(text: string): string {
  return text.replace(EMAIL, "[email]").replace(PHONE, "[téléphone]").replace(IBAN, "[iban]");
}

export type PrivacyPolicy = {
  /** Les documents déposés par les apprenants ne sont jamais envoyés bruts. */
  sendLearnerUploads: false;
  /** Les identités (nom, email) sont remplacées par des pseudonymes. */
  pseudonymizeIdentities: true;
  /** Taille maximale de contexte envoyée par appel. */
  maxContextChars: number;
};

export const DEFAULT_PRIVACY_POLICY: PrivacyPolicy = {
  sendLearnerUploads: false,
  pseudonymizeIdentities: true,
  maxContextChars: 60_000,
};
