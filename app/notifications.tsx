import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '../src/components/Screen';
import { Card } from '../src/components/Card';
import { EmptyState } from '../src/components/EmptyState';
import { ErrorState } from '../src/components/ErrorState';
import { LoadingState } from '../src/components/LoadingState';
import { useAuth } from '../src/providers/AuthProvider';
import { fetchNotifications, markNotificationsRead } from '../src/lib/queries';
import { describeLoadError, type LoadStatus } from '../src/lib/errors';
import { colors, radii, spacing, typography } from '../src/theme';
import type { NotificationRow } from '../src/types/database.types';

/** Lit un identifiant dans les données JSON d'une notification. */
function readId(data: NotificationRow['data'], key: string): string | null {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const value = data[key];
    return typeof value === 'string' ? value : null;
  }
  return null;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setStatus((current) => (current === 'ready' ? 'ready' : 'loading'));
    try {
      const notifications = await fetchNotifications(user.id);
      setItems(notifications);
      setStatus('ready');
      if (notifications.some((n) => n.read_at === null)) await markNotificationsRead(user.id);
    } catch (error) {
      console.warn('Notifications indisponibles', error);
      setErrorMessage(describeLoadError(error));
      setStatus('error');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function open(notification: NotificationRow) {
    const bookingId = readId(notification.data, 'booking_id');
    if (notification.type === 'trip_cancelled') {
      router.push('/plan-b');
    } else if (notification.type === 'new_message' && bookingId) {
      router.push(`/chat/${bookingId}`);
    } else {
      router.push('/(tabs)/bookings');
    }
  }

  return (
    <Screen edges={['bottom']}>
      <FlatList
        data={status === 'ready' ? items : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.title}>Notifications</Text>}
        ListEmptyComponent={
          status === 'loading' ? (
            <LoadingState />
          ) : status === 'error' ? (
            <ErrorState description={errorMessage} onRetry={load} />
          ) : (
            <EmptyState
              icon="notifications-outline"
              title="Rien de nouveau"
              description="Vous serez prévenu ici en cas d'annulation, de réservation ou de message."
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={() => open(item)}>
            <Card>
              <View style={styles.row}>
                {item.read_at === null ? <View style={styles.dot} /> : null}
                <Text style={typography.h3}>{item.title}</Text>
              </View>
              {item.body ? <Text style={typography.body}>{item.body}</Text> : null}
              <Text style={typography.caption}>
                {new Date(item.created_at).toLocaleString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  title: { ...typography.h1, paddingTop: spacing.md, paddingBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: radii.pill, backgroundColor: colors.primary },
});
