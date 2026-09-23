import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors, spacing, typography } from '../theme';

type Props = {
  title?: string;
  description: string;
  onRetry: () => void;
};

/** État d'erreur : une explication compréhensible et un bouton Réessayer. */
export function ErrorState({ title = 'Impossible de charger les données', description, onRetry }: Props) {
  return (
    <View style={styles.wrapper} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={40} color={colors.inkLight} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Button label="Réessayer" variant="secondary" onPress={onRetry} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  title: { ...typography.h3, textAlign: 'center' },
  description: { ...typography.caption, textAlign: 'center' },
  button: { alignSelf: 'stretch', marginTop: spacing.sm },
});
