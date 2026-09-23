import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../src/components/Screen';
import { Card } from '../src/components/Card';
import { Button } from '../src/components/Button';
import { TextField } from '../src/components/TextField';
import { Stepper } from '../src/components/Stepper';
import { EmptyState } from '../src/components/EmptyState';
import { ErrorState } from '../src/components/ErrorState';
import { LoadingState } from '../src/components/LoadingState';
import { useAuth } from '../src/providers/AuthProvider';
import { addVehicle, deleteVehicle, fetchVehicles } from '../src/lib/queries';
import { describeLoadError, type LoadStatus } from '../src/lib/errors';
import { spacing, typography } from '../src/theme';
import type { VehicleRow } from '../src/types/database.types';

export default function VehiclesScreen() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [seats, setSeats] = useState(4);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setStatus((current) => (current === 'ready' ? 'ready' : 'loading'));
    try {
      setVehicles(await fetchVehicles(user.id));
      setStatus('ready');
    } catch (error) {
      console.warn('Véhicules indisponibles', error);
      setErrorMessage(describeLoadError(error));
      setStatus('error');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleAdd() {
    if (!user) return;
    if (!brand.trim() || !model.trim()) {
      Alert.alert('Champs manquants', 'Indiquez au moins la marque et le modèle.');
      return;
    }
    setLoading(true);
    try {
      await addVehicle(user.id, brand, model, color, seats);
      setBrand('');
      setModel('');
      setColor('');
      await load();
    } catch (error) {
      console.warn('Ajout refusé', error);
      Alert.alert('Ajout impossible', "Le véhicule n'a pas pu être enregistré.");
    } finally {
      setLoading(false);
    }
  }

  function askDelete(vehicle: VehicleRow) {
    Alert.alert('Supprimer ce véhicule ?', `${vehicle.brand} ${vehicle.model}`, [
      { text: 'Retour', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteVehicle(vehicle.id);
            await load();
          } catch (error) {
            console.warn('Suppression refusée', error);
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={typography.h1}>Mes véhicules</Text>

        {status === 'loading' ? (
          <LoadingState />
        ) : status === 'error' ? (
          <ErrorState description={errorMessage} onRetry={load} />
        ) : vehicles.length === 0 ? (
          <EmptyState icon="car-sport-outline" title="Aucun véhicule" description="Ajoutez-en un ci-dessous." />
        ) : (
          vehicles.map((vehicle) => (
            <Card key={vehicle.id}>
              <Text style={typography.h3}>
                {vehicle.brand} {vehicle.model}
              </Text>
              <Text style={typography.caption}>
                {vehicle.color ? `${vehicle.color} · ` : ''}
                {vehicle.seats} places
              </Text>
              <Button label="Supprimer" variant="secondary" onPress={() => askDelete(vehicle)} />
            </Card>
          ))
        )}

        <View style={styles.form}>
          <Text style={typography.h3}>Ajouter un véhicule</Text>
          <TextField label="Marque" value={brand} onChangeText={setBrand} placeholder="Renault" />
          <TextField label="Modèle" value={model} onChangeText={setModel} placeholder="Clio" />
          <TextField label="Couleur (facultatif)" value={color} onChangeText={setColor} placeholder="Gris" />
          <Stepper label="Places (conducteur compris)" value={seats} onChange={setSeats} min={2} max={8} />
          <Button label="Ajouter" onPress={handleAdd} loading={loading} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingVertical: spacing.md, paddingBottom: spacing.xxl },
  form: { gap: spacing.md, marginTop: spacing.md },
});
