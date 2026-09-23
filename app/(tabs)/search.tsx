import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { DateTimeField } from '../../src/components/DateTimeField';
import { Stepper } from '../../src/components/Stepper';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { TripCard } from '../../src/components/TripCard';
import { Logo } from '../../src/components/Logo';
import { searchTrips, type TripWithDriver } from '../../src/lib/queries';
import { describeLoadError, type LoadStatus } from '../../src/lib/errors';
import { sizes, spacing, typography } from '../../src/theme';

export default function SearchScreen() {
  const router = useRouter();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [seats, setSeats] = useState(1);
  const [trips, setTrips] = useState<TripWithDriver[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setSearching(true);
    setStatus((current) => (current === 'ready' ? 'ready' : 'loading'));
    try {
      setTrips(await searchTrips({ origin, destination, date, seats }));
      setStatus('ready');
    } catch (error) {
      console.warn('Recherche impossible', error);
      setErrorMessage(describeLoadError(error));
      setStatus('error');
    } finally {
      setSearching(false);
    }
  }, [origin, destination, date, seats]);

  // Toujours la dernière version de `load` (filtres courants), sans relancer
  // la recherche à chaque frappe : seulement au retour sur l'écran.
  const loadRef = useRef(load);
  loadRef.current = load;

  useFocusEffect(
    useCallback(() => {
      void loadRef.current();
    }, []),
  );

  return (
    <Screen>
      <FlatList
        data={status === 'ready' ? trips : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Logo />
            <Text style={typography.h1}>Où voulez-vous aller ?</Text>
            <Text style={typography.caption}>Voyagez en toute confiance, où et quand vous voulez.</Text>
            <TextField label="Départ" value={origin} onChangeText={setOrigin} placeholder="Lyon" />
            <TextField label="Arrivée" value={destination} onChangeText={setDestination} placeholder="Paris" />
            <DateTimeField label="Date" value={date} onChange={setDate} allowAny />
            <Stepper label="Passagers" value={seats} onChange={setSeats} min={1} max={4} />
            <Button label="Rechercher" onPress={load} loading={searching} />
            {status === 'ready' && trips.length > 0 ? (
              <Text style={styles.sectionLabel}>Votre prochain trajet</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          status === 'loading' ? (
            <LoadingState label="Recherche des trajets…" />
          ) : status === 'error' ? (
            <ErrorState title="La recherche n'a pas abouti" description={errorMessage} onRetry={load} />
          ) : (
            <EmptyState
              title="Aucun trajet pour cette recherche"
              description="Essayez une autre ville, une autre date, ou moins de passagers."
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Voir le trajet ${item.origin_label} vers ${item.destination_label}`}
            onPress={() => router.push(`/trip/${item.id}`)}
          >
            <TripCard trip={item} />
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.md },
  list: { gap: spacing.sm, paddingBottom: sizes.tabBarHeight + spacing.lg },
  sectionLabel: { ...typography.sectionLabel, marginTop: spacing.sm },
});
