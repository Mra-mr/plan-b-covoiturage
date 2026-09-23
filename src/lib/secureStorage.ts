/**
 * Stockage chiffré de la session Supabase (OWASP M9).
 *
 * SecureStore écrit dans le trousseau iOS / Keystore Android, chiffrés par
 * le système, mais limite chaque valeur à 2 048 octets. Une session Supabase
 * (jetons + profil) dépasse souvent cette taille : on la découpe en morceaux
 * stockés séparément, puis on la réassemble à la lecture.
 *
 * Les sessions enregistrées avant cette version dans AsyncStorage (en clair)
 * sont migrées une fois vers le coffre, puis effacées.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHUNK_SIZE = 1800;

/** SecureStore n'accepte que lettres, chiffres, « . », « - » et « _ » dans les clés. */
function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

function countKey(key: string): string {
  return `${safeKey(key)}.count`;
}

function chunkKey(key: string, index: number): string {
  return `${safeKey(key)}.${index}`;
}

async function readChunks(key: string): Promise<string | null> {
  const count = Number(await SecureStore.getItemAsync(countKey(key)));
  if (!Number.isInteger(count) || count <= 0) return null;
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const part = await SecureStore.getItemAsync(chunkKey(key, i));
    if (part === null) return null;
    parts.push(part);
  }
  return parts.join('');
}

async function writeChunks(key: string, value: string): Promise<void> {
  await removeChunks(key);
  const count = Math.ceil(value.length / CHUNK_SIZE);
  for (let i = 0; i < count; i += 1) {
    await SecureStore.setItemAsync(chunkKey(key, i), value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
  }
  await SecureStore.setItemAsync(countKey(key), String(count));
}

async function removeChunks(key: string): Promise<void> {
  const count = Number(await SecureStore.getItemAsync(countKey(key)));
  if (Number.isInteger(count) && count > 0) {
    for (let i = 0; i < count; i += 1) {
      await SecureStore.deleteItemAsync(chunkKey(key, i));
    }
  }
  await SecureStore.deleteItemAsync(countKey(key));
}

/** Reprend une session écrite en clair par une version précédente, puis l'efface. */
async function migrateFromAsyncStorage(key: string): Promise<string | null> {
  const legacy = await AsyncStorage.getItem(key);
  if (legacy === null) return null;
  await writeChunks(key, legacy);
  await AsyncStorage.removeItem(key);
  return legacy;
}

/** Adaptateur de stockage attendu par supabase-js. */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const stored = await readChunks(key);
    if (stored !== null) return stored;
    return migrateFromAsyncStorage(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    await writeChunks(key, value);
  },
  async removeItem(key: string): Promise<void> {
    await removeChunks(key);
    await AsyncStorage.removeItem(key);
  },
};
