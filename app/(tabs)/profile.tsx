import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Avatar } from '../../src/components/Avatar';
import { Badge } from '../../src/components/Badge';
import { TextField } from '../../src/components/TextField';
import { useAuth } from '../../src/providers/AuthProvider';
import { fetchNotifications, updateProfile } from '../../src/lib/queries';
import { colors, sizes, spacing, typography } from '../../src/theme';

export default function ProfileScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const items = await fetchNotifications(user.id);
      setUnread(items.filter((n) => n.read_at === null).length);
    } catch (error) {
      console.warn('Notifications indisponibles', error);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function startEditing() {
    setFullName(profile?.full_name ?? '');
    setBio(profile?.bio ?? '');
    setEditing(true);
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { full_name: fullName.trim(), bio: bio.trim() || null });
      await refreshProfile();
      setEditing(false);
    } catch (error) {
      console.warn('Enregistrement refusé', error);
      Alert.alert('Enregistrement impossible', 'Vos modifications n’ont pas été prises en compte.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={typography.h1}>Votre profil</Text>

        <Card>
          <View style={styles.identity}>
            <Avatar name={profile?.full_name || '?'} />
            <View style={styles.identityText}>
              <Text style={typography.h3}>{profile?.full_name || 'Sans nom'}</Text>
              <Text style={typography.caption}>{user?.email}</Text>
            </View>
          </View>
          <View style={styles.stats}>
            <Badge label={`${profile?.rating?.toFixed(1) ?? '—'}/5`} tone="success" />
            <Badge label={`${profile?.trips_count ?? 0} trajet${(profile?.trips_count ?? 0) > 1 ? 's' : ''}`} />
          </View>
          {profile?.bio ? <Text style={typography.body}>{profile.bio}</Text> : null}

          {editing ? (
            <View style={styles.form}>
              <TextField label="Prénom et nom" value={fullName} onChangeText={setFullName} />
              <TextField label="Quelques mots sur vous" value={bio} onChangeText={setBio} multiline />
              <Button label="Enregistrer" onPress={save} loading={saving} />
              <Button label="Annuler" variant="ghost" onPress={() => setEditing(false)} />
            </View>
          ) : (
            <Button label="Modifier mon profil" variant="secondary" onPress={startEditing} />
          )}
        </Card>

        <Row
          icon="notifications-outline"
          label="Notifications"
          badge={unread > 0 ? String(unread) : undefined}
          onPress={() => router.push('/notifications')}
        />
        <Row icon="car-sport-outline" label="Mes véhicules" onPress={() => router.push('/vehicles')} />

        <Button label="Se déconnecter" variant="secondary" onPress={() => void signOut()} />
      </ScrollView>
    </Screen>
  );
}

function Row({
  icon,
  label,
  badge,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      <Card>
        <View style={styles.row}>
          <Ionicons name={icon} size={22} color={colors.primary} />
          <Text style={typography.body}>{label}</Text>
          {badge ? <Badge label={badge} /> : null}
          <Ionicons name="chevron-forward" size={18} color={colors.inkLight} style={styles.chevron} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingVertical: spacing.md, paddingBottom: sizes.tabBarHeight + spacing.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityText: { gap: 2, flex: 1 },
  stats: { flexDirection: 'row', gap: spacing.sm },
  form: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chevron: { marginLeft: 'auto' },
});
