import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { TextField } from '../../src/components/TextField';
import { DateTimeField } from '../../src/components/DateTimeField';
import { Stepper } from '../../src/components/Stepper';
import { Button } from '../../src/components/Button';
import { useAuth } from '../../src/providers/AuthProvider';
import { fetchVehicles, publishTrip } from '../../src/lib/queries';
import { colors, radii, sizes, spacing, typography } from '../../src/theme';
import type { VehicleRow } from '../../src/types/database.types';

export default function PublishScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departure, setDeparture] = useState<Date | null>(null);
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState('15');
  const [notes, setNotes] = useState('');
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null;
  // Le conducteur occupe une place : un véhicule de 5 places = 4 passagers.
  const maxSeats = selectedVehicle ? Math.max(1, selectedVehicle.seats - 1) : 8;

  function selectVehicle(id: string | null) {
    setVehicleId(id);
    const vehicle = vehicles.find((item) => item.id === id);
    if (vehicle && seats > vehicle.seats - 1) setSeats(Math.max(1, vehicle.seats - 1));
  }

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setVehicles(await fetchVehicles(user.id));
    } catch (e) {
      console.warn('Véhicules indisponibles', e);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handlePublish() {
    if (!user) return;
    setError(null);

    if (!origin.trim() || !destination.trim()) {
      setError('Indiquez la ville de départ et la ville d’arrivée.');
      return;
    }
    if (!departure) {
      setError('Choisissez une date et une heure de départ.');
      return;
    }
    if (departure.getTime() < Date.now()) {
      setError('La date de départ est déjà passée.');
      return;
    }
    const priceValue = Number(price.replace(',', '.'));
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      setError('Le prix doit être un nombre.');
      return;
    }

    setLoading(true);
    try {
      await publishTrip({
        driverId: user.id,
        vehicleId,
        origin,
        destination,
        departureAt: departure,
        seats,
        priceEuros: priceValue,
        notes,
      });
      setOrigin('');
      setDestination('');
      setDeparture(null);
      setNotes('');
      Alert.alert('Votre trajet est publié', 'Vous serez notifié à chaque nouvelle réservation.', [
        { text: 'Voir mes trajets', onPress: () => router.push('/(tabs)/bookings') },
      ]);
    } catch (e) {
      console.warn('Publication refusée', e);
      Alert.alert('Publication impossible', "Le trajet n'a pas pu être enregistré.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={typography.h1}>Proposer un trajet</Text>
        <Text style={typography.caption}>Indiquez votre itinéraire, vos passagers vous trouveront.</Text>

        <TextField label="Ville de départ" value={origin} onChangeText={setOrigin} placeholder="Nantes" />
        <TextField label="Ville d'arrivée" value={destination} onChangeText={setDestination} placeholder="Paris" />

        <DateTimeField label="Départ" value={departure} onChange={setDeparture} withTime days={60} />

        <Stepper label="Places proposées" value={seats} onChange={setSeats} min={1} max={maxSeats} />
        {selectedVehicle ? (
          <Text style={typography.caption}>
            {selectedVehicle.brand} {selectedVehicle.model} : {maxSeats} place{maxSeats > 1 ? 's' : ''} passager
            {maxSeats > 1 ? 's' : ''} au maximum.
          </Text>
        ) : null}
        <TextField
          label="Prix par passager (€)"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />
        <TextField
          label="Précisions (facultatif)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Un arrêt café à mi-parcours."
          multiline
        />

        <View style={styles.vehicleBlock}>
          <Text style={styles.label}>Véhicule</Text>
          {vehicles.length === 0 ? (
            <Pressable accessibilityRole="button" onPress={() => router.push('/vehicles')}>
              <Card>
                <Text style={typography.body}>Ajouter un véhicule</Text>
                <Text style={typography.caption}>Facultatif, mais rassurant pour vos passagers.</Text>
              </Card>
            </Pressable>
          ) : (
            <View style={styles.vehicleRow}>
              <VehicleChip label="Sans précision" active={vehicleId === null} onPress={() => selectVehicle(null)} />
              {vehicles.map((vehicle) => (
                <VehicleChip
                  key={vehicle.id}
                  label={`${vehicle.brand} ${vehicle.model}`}
                  active={vehicleId === vehicle.id}
                  onPress={() => selectVehicle(vehicle.id)}
                />
              ))}
            </View>
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Publier le trajet" onPress={handlePublish} loading={loading} />
      </ScrollView>
    </Screen>
  );
}

function VehicleChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : null]}
    >
      <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingVertical: spacing.lg, paddingBottom: sizes.tabBarHeight + spacing.lg },
  label: { ...typography.sectionLabel },
  vehicleBlock: { gap: spacing.xs },
  vehicleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: sizes.chipHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipLabel: { ...typography.caption, fontSize: 14, color: colors.ink, fontWeight: '600' },
  chipLabelActive: { color: colors.primary, fontWeight: '700' },
  error: { ...typography.caption, color: colors.danger },
});
