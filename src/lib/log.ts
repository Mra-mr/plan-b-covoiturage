/**
 * Journalisation de développement (OWASP M8).
 * En version publiée (__DEV__ à false), rien n'est écrit : aucune trace
 * technique ne sort du téléphone. Jamais de donnée personnelle en argument.
 */
export function warn(message: string, detail?: unknown): void {
  if (!__DEV__) return;
  if (detail === undefined) console.warn(message);
  else console.warn(message, detail);
}
