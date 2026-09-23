import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useSegments } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { fetchUnreadMessagesCount } from '../lib/messages';
import { warn } from '../lib/log';

const REFRESH_MS = 15000;

const listeners = new Set<() => void>();

/** À appeler dès qu'une conversation est lue : le badge se met à jour sans attendre. */
export function refreshUnreadMessages() {
  listeners.forEach((listener) => listener());
}

/**
 * Compteur de messages non lus pour le badge de l'onglet Messages.
 * Rafraîchi à chaque changement d'écran, au retour au premier plan et
 * toutes les 15 secondes.
 */
export function useUnreadMessages(): number {
  const { user } = useAuth();
  const segments = useSegments();
  const [unread, setUnread] = useState(0);
  const userId = user?.id ?? null;

  const refresh = useCallback(async () => {
    if (!userId) {
      setUnread(0);
      return;
    }
    try {
      setUnread(await fetchUnreadMessagesCount(userId));
    } catch (error) {
      warn('Compteur de messages indisponible', error);
    }
  }, [userId]);

  // À chaque navigation (segments change), par exemple en quittant une conversation.
  useEffect(() => {
    void refresh();
  }, [refresh, segments]);

  useEffect(() => {
    const listener = () => void refresh();
    listeners.add(listener);
    const timer = setInterval(listener, REFRESH_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      listeners.delete(listener);
      clearInterval(timer);
      subscription.remove();
    };
  }, [refresh]);

  return unread;
}
