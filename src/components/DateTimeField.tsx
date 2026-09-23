import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, sizes, spacing, typography } from '../theme';

type Props = {
  label: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
  /** Nombre de jours proposés à partir d'aujourd'hui. */
  days?: number;
  /** Affiche la ligne des créneaux horaires (toutes les 30 minutes, de 5h00 à 22h30). */
  withTime?: boolean;
  /** Ajoute un choix « Tous les jours » (recherche). */
  allowAny?: boolean;
};

const FIRST_HOUR = 5;
const LAST_HOUR = 22;
const SLOTS: { hour: number; minute: number }[] = [];
for (let hour = FIRST_HOUR; hour <= LAST_HOUR; hour += 1) {
  SLOTS.push({ hour, minute: 0 }, { hour, minute: 30 });
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

function slotLabel(hour: number, minute: number): string {
  return `${hour}h${minute === 0 ? '00' : minute}`;
}

/**
 * Sélecteur de date et d'heure maison : pas de module natif, donc
 * fonctionne dans Expo Go sans build de développement.
 */
export function DateTimeField({ label, value, onChange, days = 30, withTime = false, allowAny = false }: Props) {
  const options = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [days]);

  function pickDay(day: Date) {
    const next = new Date(day);
    const previous = value ?? new Date();
    next.setHours(withTime ? previous.getHours() : 8, withTime ? previous.getMinutes() : 0, 0, 0);
    onChange(next);
  }

  function pickSlot(hour: number, minute: number) {
    const next = new Date(value ?? options[0]);
    next.setHours(hour, minute, 0, 0);
    onChange(next);
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {allowAny ? (
          <Chip label="Tous les jours" active={value === null} onPress={() => onChange(null)} />
        ) : null}
        {options.map((day) => (
          <Chip
            key={day.toISOString()}
            label={day.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
            active={value != null && sameDay(value, day)}
            onPress={() => pickDay(day)}
          />
        ))}
      </ScrollView>

      {withTime ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {SLOTS.map(({ hour, minute }) => (
            <Chip
              key={`${hour}-${minute}`}
              label={slotLabel(hour, minute)}
              active={value?.getHours() === hour && value?.getMinutes() === minute}
              onPress={() => pickSlot(hour, minute)}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : null]}
    >
      <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.inkMuted },
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
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
});
