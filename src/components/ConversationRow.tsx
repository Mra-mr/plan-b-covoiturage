import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { formatDate, formatTime } from '../lib/format';
import { colors, spacing, typography } from '../theme';
import type { Conversation } from '../lib/messages';

type Props = { conversation: Conversation; onPress: (conversation: Conversation) => void };

/** Ligne de la liste des conversations : interlocuteur, trajet, dernier message. */
export function ConversationRow({ conversation, onPress }: Props) {
  const name = conversation.other?.full_name || (conversation.role === 'passenger' ? 'Conducteur' : 'Passager');
  const preview = conversation.lastMessage?.body ?? 'Envoyez un message pour organiser votre trajet.';
  const when = conversation.lastMessage
    ? formatTime(conversation.lastMessage.created_at)
    : formatDate(conversation.trip.departure_at);
  const cancelled =
    conversation.trip.status === 'cancelled' ||
    conversation.bookingStatus === 'cancelled_by_driver' ||
    conversation.bookingStatus === 'cancelled_by_passenger';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Conversation avec ${name}`}
      onPress={() => onPress(conversation)}
    >
      <Card style={styles.card}>
        <Avatar name={name} />
        <View style={styles.text}>
          <View style={styles.header}>
            <Text style={typography.h3} numberOfLines={1}>
              {name}
            </Text>
            <Text style={typography.caption}>{when}</Text>
          </View>
          <View style={styles.routeRow}>
            <Text style={styles.route} numberOfLines={1}>
              {conversation.trip.origin_label} → {conversation.trip.destination_label}
            </Text>
            {cancelled ? <Badge label="Annulé" tone="danger" /> : null}
          </View>
          <Text style={[typography.caption, conversation.unread > 0 ? styles.unreadText : null]} numberOfLines={1}>
            {preview}
          </Text>
        </View>
        {conversation.unread > 0 ? <Badge label={String(conversation.unread)} /> : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  route: { ...typography.caption, color: colors.primary, fontWeight: '600', flexShrink: 1 },
  unreadText: { color: colors.ink, fontWeight: '700' },
});
