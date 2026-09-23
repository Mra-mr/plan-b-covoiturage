import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { ConversationRow } from '../../src/components/ConversationRow';
import { useAuth } from '../../src/providers/AuthProvider';
import { fetchConversations, type Conversation } from '../../src/lib/messages';
import { describeLoadError, type LoadStatus } from '../../src/lib/errors';
import { sizes, spacing, typography } from '../../src/theme';

export default function MessagesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setStatus((current) => (current === 'ready' ? 'ready' : 'loading'));
    try {
      setConversations(await fetchConversations(user.id));
      setStatus('ready');
    } catch (error) {
      console.warn('Messagerie indisponible', error);
      setErrorMessage(describeLoadError(error));
      setStatus('error');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen>
      <FlatList
        data={status === 'ready' ? conversations : []}
        keyExtractor={(item) => item.bookingId}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={typography.h1}>Messages</Text>
          </View>
        }
        ListEmptyComponent={
          status === 'loading' ? (
            <LoadingState label="Chargement des conversations…" />
          ) : status === 'error' ? (
            <ErrorState title="La messagerie n'est pas disponible" description={errorMessage} onRetry={load} />
          ) : (
            <EmptyState
              icon="chatbubbles-outline"
              title="Aucun message pour le moment"
              description="Vos conversations apparaîtront ici après une réservation."
            />
          )
        }
        renderItem={({ item }) => (
          <ConversationRow conversation={item} onPress={(conversation) => router.push(`/chat/${conversation.bookingId}`)} />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, paddingTop: spacing.md, paddingBottom: spacing.sm },
  list: { gap: spacing.sm, paddingBottom: sizes.tabBarHeight + spacing.lg },
});
