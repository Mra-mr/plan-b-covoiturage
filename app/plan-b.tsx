import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '../src/components/Screen';
import { Card } from '../src/components/Card';
import { Button } from '../src/components/Button';
import { Badge } from '../src/components/Badge';
import { Avatar } from '../src/components/Avatar';
import { EmptyState } from '../src/components/EmptyState';
import { ErrorState } from '../src/components/ErrorState';
import { LoadingState } from '../src/components/LoadingState';
import { useAuth } from '../src/providers/AuthProvider';
import {
  acceptSuggestion,
  declineSuggestion,
  fetchSuggestions,
  type SuggestionWithTrip,
} from '../src/lib/queries';
import { formatDate, formatDelta, formatPrice, formatTime } from '../src/lib/format';
import { describeBookingError, describeLoadError, type LoadStatus } from '../src/lib/errors';
import { colors, spacing, typography } from '../src/theme';

function formatPriceDelta(cents: number): string {
  if (cents === 0) return 'même prix';
  return `${cents > 0 ? '+' : '−'}${formatPrice(Math.abs(cents))}`;
}

/** ⭐ Alternatives proposées après l'annulation d'un conducteur. */
export default function PlanBScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<SuggestionWithTrip[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setStatus((current) => (current === 'ready' ? 'ready' : 'loading'));
    try {
      setSuggestions(await fetchSuggestions(user.id));
      setStatus('ready');
    } catch (error) {
      console.warn('Alternatives indisponibles', error);
      setErrorMessage(describeLoadError(error));
      setStatus('error');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function accept(suggestion: SuggestionWithTrip) {
    setBusyId(suggestion.id);
    try {
      await acceptSuggestion(suggestion.id);
      Alert.alert('Trouvé grâce au Plan B', 'Votre nouvelle réservation est confirmée.', [
        { text: 'Voir ma réservation', onPress: () => router.replace('/(tabs)/bookings') },
      ]);
    } catch (error) {
      console.warn('Acceptation refusée', error);
      Alert.alert('Réservation impossible', describeBookingError(error));
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function decline(suggestion: SuggestionWithTrip) {
    try {
      await declineSuggestion(suggestion.id);
      await load();
    } catch (error) {
      console.warn('Refus impossible', error);
    }
  }

  return (
    <Screen edges={['bottom']}>
      <FlatList
        data={status === 'ready' ? suggestions : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          suggestions.length > 0 ? (
            <View style={styles.header}>
              <Text style={typography.h2}>Nous avons trouvé des alternatives pour vous</Text>
              <Text style={typography.caption}>
                Vos critères ont été conservés : même itinéraire, départ à moins de 6 heures du trajet initial.
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          status === 'loading' ? (
            <LoadingState label="Recherche de vos alternatives…" />
          ) : status === 'error' ? (
            <ErrorState description={errorMessage} onRetry={load} />
          ) : (
          <View style={styles.empty}>
            <EmptyState
              icon="shield-checkmark-outline"
              title="Aucune alternative en attente"
              description="Vous n'avez aucune annulation en cours. Si un conducteur annule un de vos trajets, vos alternatives apparaîtront ici."
            />
            <Button label="Rechercher un trajet" variant="secondary" onPress={() => router.replace('/(tabs)/search')} />
          </View>
          )
        }
        renderItem={({ item, index }) => {
          const trip = item.trip;
          const driverName = trip?.driver?.full_name || 'Conducteur';
          return (
            <Card>
              <View style={styles.badges}>
                <Badge label={index === 0 ? 'Meilleure correspondance' : 'Alternative'} />
                {item.price_delta_cents <= 0 ? <Badge label="Même prix ou moins" tone="success" /> : null}
              </View>

              <Text style={typography.h3}>
                {trip?.origin_label} → {trip?.destination_label}
              </Text>
              {trip ? (
                <Text style={typography.caption}>
                  {formatDate(trip.departure_at)} · {formatTime(trip.departure_at)}
                </Text>
              ) : null}

              <View style={styles.driverRow}>
                <Avatar name={driverName} small />
                <Text style={typography.caption}>
                  {driverName} · ★ {trip?.driver?.rating?.toFixed(1) ?? '—'}
                </Text>
                <Text style={styles.price}>{trip ? formatPrice(trip.price_cents) : '—'}</Text>
              </View>

              <Text style={typography.caption}>
                Par rapport au trajet initial :{' '}
                <Text style={styles.delta}>
                  {formatDelta(item.departure_delta_minutes)} · {formatPriceDelta(item.price_delta_cents)}
                </Text>
              </Text>

              <Button label="Réserver ce trajet" onPress={() => accept(item)} loading={busyId === item.id} />
              <View style={styles.secondaryRow}>
                <Button
                  label="Voir le trajet"
                  variant="secondary"
                  style={styles.flex}
                  onPress={() => trip && router.push(`/trip/${trip.id}`)}
                />
                <Button label="Passer" variant="ghost" style={styles.flex} onPress={() => decline(item)} />
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, paddingTop: spacing.md, paddingBottom: spacing.sm },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  empty: { gap: spacing.sm, paddingTop: spacing.md },
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  price: { ...typography.price, marginLeft: 'auto' },
  delta: { color: colors.ink, fontWeight: '700' },
  secondaryRow: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
