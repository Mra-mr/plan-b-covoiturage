import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, sizes, spacing, typography } from '../theme';

export type Segment<K extends string> = { key: K; label: string };

type Props<K extends string> = {
  segments: readonly Segment<K>[];
  value: K;
  onChange: (key: K) => void;
};

/** Sélecteur à pilules (« À venir / Passés / Annulés »), actif en encre foncée. */
export function SegmentedControl<K extends string>({ segments, value, onChange }: Props<K>) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {segments.map((segment) => {
        const active = segment.key === value;
        return (
          <Pressable
            key={segment.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={segment.label}
            onPress={() => onChange(segment.key)}
            style={[styles.pill, active ? styles.pillActive : null]}
          >
            <Text style={[styles.label, active ? styles.labelActive : null]}>{segment.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  pill: {
    minHeight: sizes.chipHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  label: { ...typography.caption, fontSize: 14, fontWeight: '600', color: colors.ink },
  labelActive: { color: colors.surface, fontWeight: '700' },
});
