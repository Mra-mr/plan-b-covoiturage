import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { colors, radii, sizes, spacing, typography } from '../theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'soft';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColors[variant]} />
      ) : (
        <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const spinnerColors: Record<Variant, string> = {
  primary: colors.surface,
  secondary: colors.primary,
  danger: colors.danger,
  ghost: colors.inkMuted,
  soft: colors.primary,
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: { height: sizes.buttonHeight, backgroundColor: colors.primary },
  secondary: {
    height: sizes.buttonSecondaryHeight,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    height: sizes.buttonDangerHeight,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.dangerBorder,
  },
  ghost: { height: sizes.buttonGhostHeight, backgroundColor: 'transparent' },
  soft: { height: sizes.buttonSoftHeight, backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
  label: { ...typography.bodyStrong },
});

const labelStyles = StyleSheet.create({
  primary: { color: colors.surface },
  secondary: { color: colors.primary, fontSize: 15 },
  danger: { color: colors.danger },
  ghost: { color: colors.inkMuted, fontSize: 14, fontWeight: '600' },
  soft: { color: colors.primary, fontSize: 15 },
});
