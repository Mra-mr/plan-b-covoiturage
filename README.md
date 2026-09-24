# Plan B — covoiturage (MVP mobile)

Application mobile de covoiturage avec la fonctionnalité **Plan B** :
quand un conducteur annule, le passager reçoit immédiatement des trajets
alternatifs réservables en un appui.

## Démarrer

```bash
npm install
npm run start        # puis scanner le QR code avec Expo Go
```

Le fichier `.env` est déjà renseigné avec le projet Supabase du bootcamp.
Pour repartir d'un projet neuf : copier `.env.example` en `.env` et y mettre
l'URL et la clé *publishable* (Dashboard → Project Settings → API keys).

## Base de données

Le schéma initial est **déjà appliqué** sur le projet Supabase lié. Le SQL est
versionné dans `supabase/migrations/` (à rejouer dans le SQL Editor si vous
créez un autre projet), et `supabase/seed.sql` prépare le scénario de démo.

Les migrations suivantes ne s'appliquent pas toutes seules : collez chacune
dans le SQL Editor du projet, dans l'ordre, puis lancez les *advisors*
Supabase (Security, Performance).

| Migration | Rôle |
|---|---|
| `20260922_002_messages.sql` | messagerie (onglet Messages) |
| `20260922_003_fix_accept_plan_b.sql` | acceptation Plan B |
| `20260922_004_bookings_unique_active.sql` | re-réservation après annulation |
| `20260923_005_trips_visible_to_passengers.sql` | trajets annulés lisibles par leurs passagers |
| `20260923_006_hardening.sql` | garde-fous (annulation, expiration Plan B, statuts, profil) |

**Typecheck sur un clone frais** : les types de routes d'expo-router sont
générés par `npm run start`. Lancez-le une fois avant `npm run typecheck`.

## Vérifier l'isolation des données (test du Jour 1)

1. Créer deux comptes différents dans l'app.
2. Publier un trajet avec le compte A, réserver avec le compte B.
3. Vérifier que chaque compte ne voit que ses propres réservations dans
   « Mes trajets ». C'est RLS qui garantit cette isolation.

## Préparer la démonstration en 3 minutes

1. Dans l'app, créez trois comptes : `sarah@demo.fr`, `thomas@demo.fr`,
   `karim@demo.fr` (le mot de passe est libre, notez-le).
2. Dans le SQL Editor de Supabase, collez et lancez `supabase/seed.sql`.
   Il crée les profils, les véhicules, les trajets et la réservation de
   Thomas sur le trajet de Sarah.
3. Le scénario est prêt.

## Scénario de démonstration

1. Connecté en **Thomas** : onglet *Mes trajets*, la réservation
   Nantes → Paris est confirmée.
2. Connectez-vous en **Sarah** : *Mes trajets* → « Annuler le trajet » →
   choisissez un motif.
3. Reconnectez-vous en **Thomas** : onglet **Plan B**, deux alternatives
   apparaissent, classées par proximité horaire.
4. Appuyez sur « Réserver ce trajet » : la nouvelle réservation est créée et
   Karim reçoit une notification.

## Version Android installable (.apk)

Compilée par EAS Build (profil `preview`), compte Expo `maroi`. Lien de la
compilation du 24/09/2026 : https://expo.dev/accounts/maroi/projects/plan-b-covoiturage/builds/3bb3d084-1817-4d12-bb41-08eab7be093b
(bouton Download). Pour en produire une nouvelle :

```bash
eas build --platform android --profile preview
```

Sur le téléphone Android : ouvrir le lien, télécharger, autoriser
l'installation depuis cette source, installer. L'app se connecte à la même
base Supabase que la version de développement. iPhone : Expo Go uniquement,
faute de compte développeur Apple.

## Le fichier CLAUDE.md

`CLAUDE.md` est la source de vérité du projet (stack, structure, design
system, règles de sécurité, feuille de route). Claude Code le lit à chaque
session : le tenir à jour vaut mieux que de répéter les consignes.
