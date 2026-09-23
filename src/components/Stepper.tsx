import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, sizes, spacing, typography } from '../theme';

type Props = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
};

export function Stepper({ label, value, min = 1, max = 4, onChange }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retirer une place"
          disabled={value <= min}
          onPress={() => onChange(value - 1)}
          style={[styles.button, value <= min ? styles.disabled : null]}
        >
          <Ionicons name="remove" size={20} color={colors.primary} />
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ajouter une place"
          disabled={value >= max}
          onPress={() => onChange(value + 1)}
          style={[styles.button, value >= max ? styles.disabled : null]}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.inkMuted },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  button: {
    width: sizes.iconButton,
    height: sizes.iconButton,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.35 },
  value: { ...typography.h3, minWidth: 24, textAlign: 'center' },
});
