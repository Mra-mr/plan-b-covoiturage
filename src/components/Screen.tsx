import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, sizes, spacing } from '../theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  /** Bords où appliquer la safe area (par défaut haut + bas). */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
};

export function Screen({ children, scroll = false, edges = ['top', 'bottom'] }: Props) {
  const Container = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <Container
        style={styles.container}
        contentContainerStyle={scroll ? styles.scrollContent : undefined}
      >
        {children}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: spacing.md },
  scrollContent: { paddingBottom: sizes.tabBarHeight + spacing.lg, gap: spacing.md },
});
