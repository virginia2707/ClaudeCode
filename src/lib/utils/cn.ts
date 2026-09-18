/** Concatène des classes conditionnelles sans dépendance externe. */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
