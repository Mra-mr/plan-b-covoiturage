import 'react-native-url-polyfill/auto';
import { secureStorage } from './secureStorage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Variables d'environnement manquantes. Copiez .env.example en .env " +
      'et renseignez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    // Session dans le trousseau chiffré du téléphone (OWASP M9), jamais en clair.
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Obligatoire en React Native : pas d'URL de callback à parser au démarrage.
    detectSessionInUrl: false,
  },
});
