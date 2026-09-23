import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { formatDate, formatPrice, formatTime } from '../lib/format';
import { spacing, typography } from '../theme';
import type { BookingWithTrip } from '../lib/queries';

type Props = {
  booking: BookingWithTrip;
  /** Réservation obtenue via une alternative Plan B. */
  viaPlanB?: boolean;
  /** Des alternatives Plan B sont en attente de choix. */
  hasAlternatives?: boolean;
  onOpen: (booking: BookingWithTrip) => void;
  onMessage: (booking: BookingWithTrip) => void;
  onCancel: (booking: BookingWithTrip) => void;
  onSeeAlternatives: () => void;
  onSearch: () => void;
};

/** Réservation que j'ai faite en tant que passager. */
export function BookingCard({
  booking,
  viaPlanB,
  hasAlternatives,
  onOpen,
  onMessage,
  onCancel,
  onSeeAlternatives,
  onSearch,
}: Props) {
  const cancelledByDriver = booking.status === 'cancelled_by_driver';
  const active = booking.status === 'confirmed' || booking.status === 'pending';
  const trip = booking.trip;
  const driverName = trip?.driver?.full_name || 'Conducteur';
  const departed = trip ? new Date(trip.departure_at).getTime() < Date.now() : false;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir le trajet ${trip?.origin_label ?? ''} vers ${trip?.destination_label ?? ''}`}
      onPress={() => onOpen(booking)}
    >
      <Card>
        <View style={styles.badges}>
          {cancelledByDriver ? <Badge label="Annulé par le conducteur" tone="danger" /> : null}
          {booking.status === 'cancelled_by_passenger' ? <Badge label="Annulé par vous" tone="warning" /> : null}
          {active && viaPlanB ? <Badge label="Réservé via Plan B" tone="success" /> : null}
          {active && !viaPlanB ? <Badge label="Réservation confirmée" tone="success" /> : null}
        </View>

        <Text style={typography.h3}>
          {trip ? `${trip.origin_label} → ${trip.destination_label}` : 'Trajet indisponible'}
        </Text>
        {trip ? (
          <Text style={typography.caption}>
            {formatDate(trip.departure_at)} · {formatTime(trip.departure_at)} · Avec {driverName}
          </Text>
        ) : null}
        <Text style={typography.caption}>
          {booking.seats} place{booking.seats > 1 ? 's' : ''} · {formatPrice(booking.price_cents)}
        </Text>

        {cancelledByDriver && hasAlternatives ? (
          <View style={styles.actions}>
            <Text style={typography.caption}>
              Votre conducteur a annulé ce trajet. Nous avons trouvé des alternatives pour vous.
            </Text>
            <Button label="Voir les alternatives" onPress={onSeeAlternatives} />
          </View>
        ) : cancelledByDriver ? (
          <View style={styles.actions}>
            <Text style={typography.caption}>
              Votre conducteur a annulé ce trajet. Aucune alternative n'est disponible pour l'instant.
            </Text>
            <Button label="Rechercher un trajet" variant="secondary" onPress={onSearch} />
          </View>
        ) : active && !departed ? (
          <View style={styles.actions}>
            <Button label="Écrire au conducteur" variant="secondary" onPress={() => onMessage(booking)} />
            <Button label="Annuler ma place" variant="ghost" onPress={() => onCancel(booking)} />
          </View>
        ) : active ? (
          <Button label="Écrire au conducteur" variant="secondary" onPress={() => onMessage(booking)} />
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
});
