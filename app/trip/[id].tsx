import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Avatar } from '../../src/components/Avatar';
import { Badge } from '../../src/components/Badge';
import { Stepper } from '../../src/components/Stepper';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { bookTrip, fetchTrip, type TripDetail } from '../../src/lib/queries';
import { useAuth } from '../../src/providers/AuthProvider';
import { formatDate, formatPrice, formatTime } from '../../src/lib/format';
import { describeBookingError, describeLoadError } from '../../src/lib/errors';
import { spacing, typography } from '../../src/theme';
import { warn } from '../../src/lib/log';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [seats, setSeats] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      setTrip(await fetchTrip(id));
    } catch (error) {
      warn('Trajet introuvable', error);
      setLoadError(describeLoadError(error));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleBook() {
    if (!trip || !user) return;
    setBooking(true);
    try {
      await bookTrip(trip.id, user.id, seats, trip.price_cents);
      Alert.alert(
        'Réservation confirmée',
        `Retrouvez ce trajet dans « Mes trajets » et écrivez à ${driverName} pour organiser le départ.`,
        [{ text: 'Voir ma réservation', onPress: () => router.replace('/(tabs)/bookings') }],
      );
    } catch (error) {
      warn('Réservation refusée', error);
      Alert.alert('Réservation impossible', describeBookingError(error));
    } finally {
      setBooking(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState label="Chargement du trajet…" />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen>
        <ErrorState description={loadError} onRetry={load} />
      </Screen>
    );
  }

  if (!trip) {
    return (
      <Screen>
        <Text style={styles.gone}>Ce trajet n'existe plus ou n'est plus accessible.</Text>
      </Screen>
    );
  }

  const isOwnTrip = trip.driver_id === user?.id;
  const bookable = trip.status === 'scheduled' && trip.seats_available > 0 && !isOwnTrip;
  const driverName = trip.driver?.full_name || 'Conducteur';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {trip.status === 'cancelled' ? <Badge label="Trajet annulé" tone="danger" /> : null}

        <Text style={typography.h1}>
          {trip.origin_label} → {trip.destination_label}
        </Text>
        <Text style={typography.caption}>
          {formatDate(trip.departure_at)} · départ à {formatTime(trip.departure_at)}
        </Text>

        <Card>
          <View style={styles.driverRow}>
            <Avatar name={driverName} />
            <View style={styles.driverText}>
              <Text style={typography.h3}>{driverName}</Text>
              <Text style={typography.caption}>
                {trip.driver?.rating?.toFixed(1) ?? '—'}/5 · {trip.driver?.trips_count ?? 0} trajet
                {(trip.driver?.trips_count ?? 0) > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          {trip.driver?.bio ? <Text style={typography.body}>{trip.driver.bio}</Text> : null}
          {trip.vehicle ? (
            <Text style={typography.caption}>
              Véhicule : {trip.vehicle.brand} {trip.vehicle.model}
              {trip.vehicle.color ? ` · ${trip.vehicle.color}` : ''}
            </Text>
          ) : null}
        </Card>

        <Card>
          <View style={styles.row}>
            <Text style={typography.body}>Prix par passager</Text>
            <Text style={typography.price}>{formatPrice(trip.price_cents)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={typography.body}>Places disponibles</Text>
            <Text style={typography.body}>
              {trip.seats_available} sur {trip.seats_total}
            </Text>
          </View>
          {trip.instant_booking ? <Badge label="Réservation immédiate" tone="success" /> : null}
          {trip.notes ? <Text style={typography.caption}>{trip.notes}</Text> : null}
        </Card>

        {isOwnTrip ? (
          <Text style={typography.caption}>C'est votre trajet : retrouvez vos passagers dans « Mes trajets ».</Text>
        ) : (
          <Card>
            <Stepper
              label="Nombre de places"
              value={seats}
              onChange={setSeats}
              min={1}
              max={Math.max(1, Math.min(4, trip.seats_available))}
            />
            <View style={styles.row}>
              <Text style={typography.body}>Total</Text>
              <Text style={typography.price}>{formatPrice(trip.price_cents * seats)}</Text>
            </View>
            <Button
              label={bookable ? 'Réserver' : 'Trajet indisponible'}
              onPress={handleBook}
              loading={booking}
              disabled={!bookable}
            />
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingVertical: spacing.md, paddingBottom: spacing.xxl },
  gone: { ...typography.body, textAlign: 'center', marginTop: spacing.xxl },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  driverText: { gap: 2 },
});
