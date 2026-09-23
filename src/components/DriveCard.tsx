import { StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { formatDate, formatTime } from '../lib/format';
import { spacing, typography } from '../theme';
import type { TripRow } from '../types/database.types';

type Props = {
  trip: TripRow;
  busy?: boolean;
  onCancel: (trip: TripRow) => void;
};

function plural(count: number, word: string): string {
  return `${count} ${word}${count > 1 ? 's' : ''}`;
}

/** Trajet que je conduis, avec l'annulation Plan B tant qu'il n'est pas parti. */
export function DriveCard({ trip, busy, onCancel }: Props) {
  const passengers = trip.seats_total - trip.seats_available;
  const departed = new Date(trip.departure_at).getTime() < Date.now();
  const cancellable = trip.status === 'scheduled' && !departed;

  return (
    <Card>
      {trip.status === 'cancelled' ? <Badge label="Annulé" tone="danger" /> : null}
      {trip.status === 'scheduled' && departed ? <Badge label="Trajet passé" tone="warning" /> : null}
      <Text style={typography.h3}>
        {trip.origin_label} → {trip.destination_label}
      </Text>
      <Text style={typography.caption}>
        {formatDate(trip.departure_at)} · {formatTime(trip.departure_at)}
      </Text>
      <Text style={typography.caption}>
        {plural(passengers, 'passager')} · {plural(trip.seats_available, 'place')} libre
        {trip.seats_available > 1 ? 's' : ''}
      </Text>

      {cancellable ? (
        <View style={styles.actions}>
          <Text style={typography.caption}>
            Vos passagers seront prévenus et recevront automatiquement des alternatives grâce au Plan B.
          </Text>
          <Button label="Annuler ce trajet" variant="danger" loading={busy} onPress={() => onCancel(trip)} />
        </View>
      ) : trip.cancellation_reason ? (
        <Text style={typography.caption}>Motif : {trip.cancellation_reason}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm, marginTop: spacing.xs },
});
