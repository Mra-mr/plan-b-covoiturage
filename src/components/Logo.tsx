import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

type Props = { size?: 'sm' | 'lg' };

const SIZES = { sm: 28, lg: 44 } as const;

/** Logotype : la tuile bleue aux deux guillemets et le nom de la marque. */
export function Logo({ size = 'sm' }: Props) {
  const side = SIZES[size];
  return (
    <View accessibilityRole="header" accessibilityLabel="BlaBlaCar" style={styles.row}>
      <Image
        source={require('../../assets/logo-tile.png')}
        accessibilityIgnoresInvertColors
        style={{ width: side, height: side, borderRadius: side * 0.22 }}
      />
      <Text style={[styles.word, size === 'lg' ? styles.wordLarge : null]}>BlaBlaCar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  word: { ...typography.h3, fontWeight: '800', letterSpacing: -0.4, color: colors.ink },
  wordLarge: { ...typography.h2 },
});
