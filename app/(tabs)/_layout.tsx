import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadow, sizes, spacing, typography } from '../../src/theme';
import { useUnreadMessages } from '../../src/hooks/useUnreadMessages';

export default function TabsLayout() {
  const unreadMessages = useUnreadMessages();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkLight,
        tabBarStyle: {
          position: 'absolute',
          left: spacing.sm + 2,
          right: spacing.sm + 2,
          bottom: spacing.sm + 2,
          height: sizes.tabBarHeight,
          paddingBottom: spacing.sm,
          paddingTop: spacing.xs,
          borderTopWidth: 0,
          borderRadius: radii.pill,
          backgroundColor: colors.surface,
          ...shadow.tabBar,
        },
        tabBarItemStyle: { borderRadius: radii.pill },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="search"
        options={{
          title: 'Rechercher',
          tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="publish"
        options={{
          title: 'Publier',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Mes trajets',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" color={color} size={size} />,
          tabBarBadge: unreadMessages > 0 ? (unreadMessages > 9 ? '9+' : unreadMessages) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            color: colors.surface,
            fontSize: typography.caption.fontSize - 2,
            fontWeight: '700',
          },
          tabBarAccessibilityLabel:
            unreadMessages > 0 ? `Messages, ${unreadMessages} non lu${unreadMessages > 1 ? 's' : ''}` : 'Messages',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
