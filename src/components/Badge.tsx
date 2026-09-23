import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

type Tone = 'info' | 'success' | 'danger' | 'warning';

const backgrounds: Record<Tone, string> = {
  info: colors.primarySoft,
  success: colors.successSoft,
  danger: colors.dangerSoft,
  warning: colors.warningSoft,
};

const foregrounds: Record<Tone, string> = {
  info: colors.primary,
  success: colors.success,
  danger: colors.danger,
  warning: colors.warning,
};

export function Badge({ label, tone = 'info' }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.badge, { backgroundColor: backgrounds[tone] }]}>
      <Text style={[styles.label, { color: foregrounds[tone] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: { ...typography.caption, fontWeight: '700' },
});
