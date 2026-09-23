import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { DriveCard } from '../../src/components/DriveCard';
import { BookingCard } from '../../src/components/BookingCard';
import { useAuth } from '../../src/providers/AuthProvider';
import {
  cancelMyBooking,
  cancelTrip,
  fetchAcceptedPlanBTripIds,
  fetchMyBookings,
  fetchMyTrips,
  fetchSuggestions,
  type BookingWithTrip,
} from '../../src/lib/queries';
import { describeCancelError, describeLoadError, type LoadStatus } from '../../src/lib/errors';
import { sizes, spacing, typography } from '../../src/theme';
import type { TripRow } from '../../src/types/database.types';
import { warn } from '../../src/lib/log';

const CANCEL_REASONS = ['Imprévu personnel', 'Véhicule indisponible', 'Trajet reporté'];

const SEGMENTS = [
  { key: 'upcoming', label: 'À venir' },
  { key: 'past', label: 'Passés' },
  { key: 'cancelled', label: 'Annulés' },
] as const;
type SegmentKey = (typeof SEGMENTS)[number]['key'];

function driveSegment(trip: TripRow): SegmentKey {
  if (trip.status === 'cancelled') return 'cancelled';
  if (trip.status === 'completed' || new Date(trip.departure_at).getTime() < Date.now()) return 'past';
  return 'upcoming';
}

function bookingSegment(booking: BookingWithTrip): SegmentKey {
  if (booking.status === 'cancelled_by_driver' || booking.status === 'cancelled_by_passenger') return 'cancelled';
  const departure = booking.trip ? new Date(booking.trip.departure_at).getTime() : Date.now();
  if (booking.status === 'completed' || departure < Date.now()) return 'past';
  return 'upcoming';
}

export default function BookingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [segment, setSegment] = useState<SegmentKey>('upcoming');
  const [drives, setDrives] = useState<TripRow[]>([]);
  const [bookings, setBookings] = useState<BookingWithTrip[]>([]);
  const [planBTripIds, setPlanBTripIds] = useState<string[]>([]);
  const [pendingSuggestions, setPendingSuggestions] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setStatus((current) => (current === 'ready' ? 'ready' : 'loading'));
    try {
      const [tripsData, bookingsData, planBIds, suggestions] = await Promise.all([
        fetchMyTrips(user.id),
        fetchMyBookings(user.id),
        fetchAcceptedPlanBTripIds(user.id),
        fetchSuggestions(user.id),
      ]);
      setDrives(tripsData);
      setBookings(bookingsData);
      setPlanBTripIds(planBIds);
      setPendingSuggestions(suggestions.length);
      setStatus('ready');
    } catch (error) {
      warn('Chargement impossible', error);
      setErrorMessage(describeLoadError(error));
      setStatus('error');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function askCancelTrip(trip: TripRow) {
    Alert.alert('Annuler ce trajet ?', "Choisissez le motif de l'annulation. Vos passagers seront prévenus.", [
      { text: 'Retour', style: 'cancel' },
      ...CANCEL_REASONS.map((reason) => ({ text: reason, onPress: () => void doCancelTrip(trip.id, reason) })),
    ]);
  }

  async function doCancelTrip(tripId: string, reason: string) {
    setBusy(true);
    try {
      await cancelTrip(tripId, reason);
      await load();
      Alert.alert('Trajet annulé', 'Vos passagers ont été prévenus et reçoivent des alternatives.');
    } catch (error) {
      warn('Annulation refusée', error);
      Alert.alert('Annulation impossible', describeCancelError(error));
    } finally {
      setBusy(false);
    }
  }

  function askCancelBooking(booking: BookingWithTrip) {
    Alert.alert('Annuler votre réservation ?', 'La place sera remise à disposition.', [
      { text: 'Retour', style: 'cancel' },
      {
        text: 'Annuler ma place',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await cancelMyBooking(booking.id);
            await load();
          } catch (error) {
            warn('Annulation refusée', error);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  const visibleDrives = drives.filter((trip) => driveSegment(trip) === segment);
  const visibleBookings = bookings.filter((booking) => bookingSegment(booking) === segment);
  const showPlanBBanner = pendingSuggestions > 0 && segment !== 'cancelled';

  return (
    <Screen>
      <FlatList
        data={status === 'ready' ? visibleBookings : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.section}>
            <Text style={typography.h1}>Mes trajets</Text>
            <SegmentedControl segments={SEGMENTS} value={segment} onChange={setSegment} />

            {showPlanBBanner ? (
              <Card>
                <Badge label="Trajet annulé" tone="danger" />
                <Text style={typography.h3}>Votre trajet a été annulé</Text>
                <Text style={typography.caption}>
                  Votre conducteur a annulé ce trajet. Nous avons trouvé {pendingSuggestions} alternative
                  {pendingSuggestions > 1 ? 's' : ''} pour vous.
                </Text>
                <Button label="Voir les alternatives" onPress={() => router.push('/plan-b')} />
              </Card>
            ) : null}

            {status === 'ready' ? (
              <>
                <Text style={typography.sectionLabel}>Je conduis</Text>
                {visibleDrives.length === 0 ? (
                  <Text style={typography.caption}>Aucun trajet dans cette catégorie.</Text>
                ) : (
                  visibleDrives.map((trip) => (
                    <DriveCard key={trip.id} trip={trip} busy={busy} onCancel={askCancelTrip} />
                  ))
                )}
                <Text style={typography.sectionLabel}>Je voyage</Text>
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          status === 'loading' ? (
            <LoadingState label="Chargement de vos trajets…" />
          ) : status === 'error' ? (
            <ErrorState description={errorMessage} onRetry={load} />
          ) : (
            <View style={styles.empty}>
              <EmptyState
                icon="ticket-outline"
                title="Aucune réservation"
                description="Vos réservations apparaîtront ici."
              />
              {segment === 'upcoming' ? (
                <Button label="Rechercher un trajet" variant="secondary" onPress={() => router.push('/(tabs)/search')} />
              ) : null}
            </View>
          )
        }
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            viaPlanB={item.trip ? planBTripIds.includes(item.trip.id) : false}
            hasAlternatives={pendingSuggestions > 0}
            onSearch={() => router.push('/(tabs)/search')}
            onOpen={(booking) => booking.trip && router.push(`/trip/${booking.trip.id}`)}
            onMessage={(booking) => router.push(`/chat/${booking.id}`)}
            onCancel={askCancelBooking}
            onSeeAlternatives={() => router.push('/plan-b')}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm, paddingBottom: sizes.tabBarHeight + spacing.lg },
  section: { gap: spacing.sm, paddingTop: spacing.md },
  empty: { gap: spacing.sm },
});
