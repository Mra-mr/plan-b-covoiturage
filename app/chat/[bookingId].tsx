import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { MessageBubble } from '../../src/components/MessageBubble';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { useAuth } from '../../src/providers/AuthProvider';
import { fetchMessages, markConversationRead, sendMessage } from '../../src/lib/messages';
import { refreshUnreadMessages } from '../../src/hooks/useUnreadMessages';
import { describeLoadError, type LoadStatus } from '../../src/lib/errors';
import { colors, radii, sizes, spacing, typography } from '../../src/theme';
import type { MessageRow } from '../../src/types/database.types';
import { warn } from '../../src/lib/log';

const REFRESH_MS = 5000;

export default function ChatScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { user } = useAuth();
  const listRef = useRef<FlatList<MessageRow>>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    if (!bookingId || !user) return;
    setStatus((current) => (current === 'ready' ? 'ready' : 'loading'));
    try {
      const items = await fetchMessages(bookingId);
      setMessages(items);
      setStatus('ready');
      if (items.some((item) => item.sender_id !== user.id && item.read_at === null)) {
        await markConversationRead(bookingId, user.id);
        refreshUnreadMessages();
      }
    } catch (error) {
      warn('Messages indisponibles', error);
      setErrorMessage(describeLoadError(error));
      setStatus((current) => (current === 'ready' ? 'ready' : 'error'));
      setNotice(describeLoadError(error));
    }
  }, [bookingId, user]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => void load(), REFRESH_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  async function send() {
    const body = draft.trim();
    if (!body || !bookingId || !user) return;
    setSending(true);
    try {
      await sendMessage(bookingId, user.id, body);
      setDraft('');
      await load();
    } catch (error) {
      warn('Envoi refusé', error);
      setNotice("Votre message n'a pas pu être envoyé.");
    } finally {
      setSending(false);
    }
  }

  const canSend = draft.trim().length > 0 && !sending;

  return (
    <Screen edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            status === 'loading' ? (
              <LoadingState />
            ) : status === 'error' ? (
              <ErrorState title="Conversation indisponible" description={errorMessage} onRetry={load} />
            ) : (
              <Text style={styles.hint}>Envoyez un message pour organiser votre trajet.</Text>
            )
          }
          renderItem={({ item }) => <MessageBubble message={item} mine={item.sender_id === user?.id} />}
        />

        {notice && status === 'ready' ? <Text style={styles.notice}>{notice}</Text> : null}

        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Votre message"
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Votre message"
            placeholderTextColor={colors.inkLight}
            multiline
            maxLength={2000}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Envoyer"
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={send}
            style={[styles.send, canSend ? null : styles.sendDisabled]}
          >
            <Ionicons name="send" size={20} color={colors.surface} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: spacing.sm, paddingVertical: spacing.md, flexGrow: 1 },
  hint: { ...typography.caption, textAlign: 'center', marginTop: spacing.xl },
  notice: { ...typography.caption, color: colors.danger, textAlign: 'center', paddingBottom: spacing.xs },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: radii.lg,
    backgroundColor: colors.neutral,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: sizes.iconButton,
  },
  sendDisabled: { opacity: 0.4 },
});
