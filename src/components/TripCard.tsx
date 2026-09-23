import { StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { formatDate, formatPrice, formatTime } from '../lib/format';
import { colors, spacing, typography } from '../theme';
import type { TripWithDriver } from '../lib/queries';

type Props = {
  trip: TripWithDriver;
  /** Badge optionnel affiché en haut de la carte. */
  badge?: { label: string; tone?: 'info' | 'success' | 'danger' | 'warning' };
  footer?: React.ReactNode;
};

export function TripCard({ trip, badge, footer }: Props) {
  const driverName = trip.driver?.full_name || 'Conducteur';
  return (
    <Card>
      {badge ? <Badge label={badge.label} tone={badge.tone} /> : null}

      <View style={styles.headline}>
        <Text style={styles.time}>{formatTime(trip.departure_at)}</Text>
        <Text style={styles.route} numberOfLines={2}>
          {trip.origin_label} → {trip.destination_label}
        </Text>
        <Text style={typography.price}>{formatPrice(trip.price_cents)}</Text>
      </View>

      <Text style={typography.caption}>{formatDate(trip.departure_at)}</Text>

      <View style={styles.driverRow}>
        <Avatar name={driverName} small />
        <Text style={typography.caption}>
          {driverName} · {trip.driver?.rating?.toFixed(1) ?? '—'}/5
        </Text>
        <Text style={styles.seats}>
          {trip.seats_available} place{trip.seats_available > 1 ? 's' : ''}
        </Text>
      </View>

      {footer}
    </Card>
  );
}

const styles = StyleSheet.create({
  headline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  time: { ...typography.h3 },
  route: { ...typography.body, flex: 1 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  seats: { ...typography.caption, marginLeft: 'auto', color: colors.success, fontWeight: '700' },
});
