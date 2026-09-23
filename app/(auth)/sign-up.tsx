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

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setInfo(null);
    if (fullName.trim().length < 2) {
      setError('Indiquez votre prénom et votre nom.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Indiquez une adresse e-mail valide.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setLoading(true);
    try {
      const needsConfirmation = await signUp(email.trim(), password, fullName.trim());
      if (needsConfirmation) {
        setInfo(
          'Compte créé. Ouvrez l’e-mail de confirmation que nous venons de vous envoyer, puis connectez-vous.',
        );
        setPassword('');
      }
    } catch (e) {
      setError("La création du compte n'a pas abouti. Vérifiez votre e-mail.");
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
          <Text style={typography.h1}>Créer votre compte</Text>
          <Text style={typography.caption}>Quelques secondes suffisent.</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Prénom et nom"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Thomas Martin"
            maxLength={80}
          />
          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="vous@exemple.fr"
          />
          <TextField
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="8 caractères minimum"
            error={error}
          />
          {info ? <Text style={styles.info}>{info}</Text> : null}
          <Button label="Créer mon compte" onPress={handleSubmit} loading={loading} />
        </View>

        <View style={styles.footer}>
          <Text style={typography.caption}>Déjà inscrit ? </Text>
          <Link href="/(auth)/sign-in" style={styles.link}>
            Se connecter
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
  info: { ...typography.caption, color: colors.success, fontWeight: '600' },
});
