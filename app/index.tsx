import { Redirect } from 'expo-router';

export default function Index() {
  // L'AuthGate du layout racine se charge de la redirection réelle.
  return <Redirect href="/(tabs)/search" />;
}
