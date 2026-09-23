import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { Logo } from '../../src/components/Logo';
import { useAuth } from '../../src/providers/AuthProvider';
import { isValidEmail } from '../../src/lib/format';
import { colors, spacing, typography } from '../../src/theme';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!isValidEmail(email)) {
      setError('Indiquez une adresse e-mail valide.');
      return;
    }
    if (!password) {
      setError('Indiquez votre mot de passe.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError("L'e-mail ou le mot de passe ne correspond pas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Logo size="lg" />
          <Text style={typography.h1}>Bon retour parmi nous</Text>
          <Text style={typography.caption}>Connectez-vous pour retrouver vos trajets.</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="vous@exemple.fr"
          />
          <TextField
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            placeholder="••••••••"
            error={error}
          />
          <Button label="Se connecter" onPress={handleSubmit} loading={loading} />
        </View>

        <View style={styles.footer}>
          <Text style={typography.caption}>Pas encore de compte ? </Text>
          <Link href="/(auth)/sign-up" style={styles.link}>
            Créer un compte
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'center', gap: spacing.xl },
  header: { gap: spacing.sm },
  form: { gap: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  link: { ...typography.caption, color: colors.primary, fontWeight: '700' },
});
