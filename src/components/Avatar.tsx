import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, sizes, typography } from '../theme';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  const size = small ? sizes.avatarSm : sizes.avatar;
  return (
    <View
      accessibilityLabel={`Photo de ${name || 'utilisateur'}`}
      style={[styles.circle, { width: size, height: size, borderRadius: radii.pill }]}
    >
      <Text style={[styles.label, small ? styles.labelSm : null]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.body, color: colors.primary, fontWeight: '700' },
  labelSm: { fontSize: 13 },
});
