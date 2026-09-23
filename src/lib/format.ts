/** Helpers d'affichage — jamais de formatage ad hoc dans les écrans. */

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatDelta(minutes: number): string {
  if (minutes === 0) return 'même heure';
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const rest = abs % 60;
  const label = hours === 0 ? `${rest} min` : rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`;
  return minutes > 0 ? `${label} plus tard` : `${label} plus tôt`;
}
