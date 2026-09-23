/**
 * Traduction des erreurs Supabase en phrases compréhensibles.
 * Jamais de message technique à l'écran : on journalise, on explique.
 */

type SupabaseLikeError = { code?: string; message?: string };

function asSupabaseError(error: unknown): SupabaseLikeError {
  if (typeof error === 'object' && error !== null) {
    const { code, message } = error as { code?: unknown; message?: unknown };
    return {
      code: typeof code === 'string' ? code : undefined,
      message: typeof message === 'string' ? message : undefined,
    };
  }
  return {};
}

/** Type d'état partagé par les écrans qui chargent des données. */
export type LoadStatus = 'loading' | 'ready' | 'error';

/** Explique pourquoi un chargement a échoué (réseau, serveur…). */
export function describeLoadError(error: unknown): string {
  const text = (asSupabaseError(error).message ?? '').toLowerCase();
  if (text.includes('network') || text.includes('fetch') || text.includes('internet')) {
    return 'Pas de connexion. Vérifiez votre réseau, puis réessayez.';
  }
  return "Les données n'ont pas pu être chargées. Réessayez dans un instant.";
}

/** Explique pourquoi l'annulation d'un trajet par son conducteur a échoué. */
export function describeCancelError(error: unknown): string {
  const text = (asSupabaseError(error).message ?? '').toLowerCase();
  if (text.includes('déjà parti')) return 'Ce trajet est déjà parti, il ne peut plus être annulé.';
  if (text.includes('déjà annulé')) return 'Ce trajet est déjà annulé ou terminé.';
  if (text.includes('seul le conducteur')) return 'Seul le conducteur peut annuler ce trajet.';
  return "Ce trajet n'a pas pu être annulé. Réessayez dans un instant.";
}

/** Explique pourquoi une réservation (directe ou via Plan B) a échoué. */
export function describeBookingError(error: unknown): string {
  const { code, message = '' } = asSupabaseError(error);
  const text = message.toLowerCase();

  if (code === '23505') return 'Vous avez déjà une réservation sur ce trajet.';
  if (text.includes('plus de place')) return "Ce trajet vient d'être complet.";
  if (text.includes("n'est plus disponible")) return "Cette alternative n'est plus disponible.";
  if (text.includes('introuvable')) return "Cette proposition n'existe plus.";
  if (code === '42501' || text.includes('row-level security')) {
    return "Vous ne pouvez pas réserver ce trajet : c'est peut-être le vôtre.";
  }
  if (text.includes('network') || text.includes('fetch')) {
    return 'Connexion impossible. Vérifiez votre réseau et réessayez.';
  }
  return "La réservation n'a pas abouti. Réessayez dans un instant.";
}
