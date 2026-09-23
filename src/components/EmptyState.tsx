import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
};

export function EmptyState({ icon = 'car-outline', title, description }: Props) {
  return (
    <View style={styles.wrapper}>
      <Ionicons name={icon} size={40} color={colors.inkLight} />
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  title: { ...typography.h3, textAlign: 'center' },
  description: { ...typography.caption, textAlign: 'center' },
});
