# CLAUDE.md — Plan B (application mobile de covoiturage)

Ce fichier est la **source de vérité** du projet. Claude Code le lit à chaque
session : toute décision de structure, de style ou de sécurité s'y trouve.
En cas de contradiction entre une demande orale et ce fichier, **demander une
clarification avant de coder**.

---

## 1. Le produit en une phrase

Une application mobile de covoiturage (passagers + conducteurs) dont la
fonctionnalité différenciante s'appelle **Plan B** : lorsqu'un conducteur
annule un trajet réservé, l'application propose **automatiquement et
immédiatement** au passager des trajets alternatifs équivalents, réservables
en un appui.

### Personas

| Persona | Profil | Besoin |
|---|---|---|
| **Thomas**, 24 ans | Étudiant à Lyon, passager, budget limité | Ne jamais se retrouver bloqué à cause d'une annulation |
| **Sarah**, 34 ans | Chargée de communication à Nantes, conductrice Nantes–Paris | Annuler sans culpabiliser, sans gérer elle-même le problème |

### Priorités (en cas d'arbitrage, dans cet ordre)

1. **Plan B** — c'est la démonstration
2. Parcours passager (recherche → détail → réservation)
3. Parcours conducteur (publication → annulation)
4. Respect du design system
5. Accessibilité

### Démonstration à réussir de bout en bout

Recherche → réservation → annulation par le conducteur → écran Plan B →
nouvelle réservation. Ce chemin doit fonctionner **sans erreur et sans écran
vide** à tout moment du projet : ne jamais casser un maillon pour en
améliorer un autre.

---

## 2. Stack technique

| Couche | Choix | Version |
|---|---|---|
| Framework | Expo (SDK 57) | `~57.0.24` |
| Langage | TypeScript strict | `~6.0.3` |
| Navigation | `expo-router` (routage par fichiers) | `~57.0.22` |
| Backend | Supabase (Postgres + Auth + RLS) | `@supabase/supabase-js ^2.116` |
| Stockage session | `expo-secure-store` (trousseau chiffré, découpage en morceaux de 1 800 octets dans `src/lib/secureStorage.ts`) ; `@react-native-async-storage/async-storage` `2.2.0` ne sert plus qu'à migrer les anciennes sessions | — |
| Icônes | `@expo/vector-icons` (Ionicons) | `^15.1.1` |
| Test sur téléphone | Expo Go | — |

**Interdits :** ajouter une bibliothèque UI tierce (NativeBase, Tamagui,
gluestack…), un state manager global (Redux, Zustand, Jotai), ou une
bibliothèque de formulaires. Le projet doit rester lisible : `useState`,
`useEffect` et le contexte React suffisent.

**Avant d'ajouter une dépendance :** toujours `npx expo install <paquet>`
(jamais `npm install` seul), pour rester compatible avec le SDK Expo.

---

## 3. Structure des dossiers

```
plan-b-covoiturage/
├── CLAUDE.md                  ← ce fichier
├── app/                       ← routes (expo-router) : UNIQUEMENT des écrans
│   ├── _layout.tsx            ← providers + garde d'authentification
│   ├── index.tsx              ← redirection
│   ├── (auth)/                ← groupe non authentifié
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   ├── (tabs)/                ← groupe authentifié, barre d'onglets (arborescence BlaBlaCar)
│   │   ├── _layout.tsx
│   │   ├── search.tsx         ← Rechercher : recherche filtrée (villes, date, places)
│   │   ├── publish.tsx        ← Publier (conducteur)
│   │   ├── bookings.tsx       ← Mes trajets : à venir / passés / annulés (2 rôles)
│   │   ├── messages.tsx       ← Messages : une conversation par réservation
│   │   └── profile.tsx        ← Profil (notifications, véhicules)
│   ├── plan-b.tsx             ← ⭐ alternatives après annulation (depuis Mes trajets)
│   ├── chat/[bookingId].tsx   ← fil de discussion d'une réservation
│   ├── trip/[id].tsx          ← détail d'un trajet + réservation
│   ├── vehicles.tsx           ← gestion des véhicules
│   └── notifications.tsx      ← notifications in-app
├── src/
│   ├── components/            ← Button, Card, Screen, TextField, Avatar,
│   │                             Badge, Stepper, DateTimeField, TripCard,
│   │                             EmptyState, ErrorState, LoadingState,
│   │                             Logo, SegmentedControl,
│   │                             DriveCard, BookingCard, ConversationRow,
│   │                             MessageBubble
│   ├── lib/
│   │   ├── supabase.ts        ← client unique
│   │   ├── queries.ts         ← accès aux données (trajets, réservations, Plan B…)
│   │   ├── messages.ts        ← accès aux données de la messagerie
│   │   └── format.ts          ← prix, dates, écarts horaires
│   ├── hooks/                 ← useUnreadMessages (badge de l'onglet Messages)
│   ├── providers/             ← AuthProvider (contexte de session)
│   ├── theme/                 ← design system (couleurs, rayons, typo)
│   └── types/                 ← types de la base
├── supabase/
│   ├── migrations/            ← SQL versionné (une migration = un fichier)
│   └── seed.sql               ← données de démonstration
└── .env                       ← variables locales, jamais commitées
```

### Règles de placement

- **Un fichier dans `app/` = un écran.** Aucun appel Supabase direct : tout
  passe par une fonction de `src/lib/queries.ts` (ou `src/lib/messages.ts`
  pour la messagerie). L'écran affiche et délègue.
- **Toute nouvelle requête va dans `src/lib/`**, typée, avec sa gestion
  d'erreur. Un écran qui importe `supabase` directement est un bug.
- **Aucun composant réutilisable dans `app/`** — il irait dans `src/components/`.
- **Aucune requête Supabase dans un composant de `src/components/`** : les
  composants reçoivent leurs données en props.
- Un fichier > 250 lignes doit être découpé.
- **Trois états sur tout écran qui charge des données** : `LoadingState` pendant
  le chargement, `EmptyState` si la liste est vide, `ErrorState` (message
  compréhensible via `describeLoadError` + bouton Réessayer) en cas d'échec.
  Jamais d'écran blanc ni de message technique.

---

## 4. Design system (imposé, non négociable)

Toutes les valeurs vivent dans `src/theme/index.ts`. **Aucune couleur
hexadécimale, aucune taille de police et aucun rayon en dur dans un écran** —
toujours importer depuis le thème.

| Rôle | Valeur |
|---|---|
| Action principale / liens | `#0071EB` (pressé : `#0065D1`, fond doux : `#E6F2FE`) |
| Textes forts | `#001536` |
| Textes atténués / labels | `#576680` (placeholders : `#8B96AB`) |
| Fond d'écran | `#F5F7FB` — surfaces (cartes, champs, barre) en `#FFFFFF` |
| Bordures | `rgba(48,50,51,0.12)`, 1 px |
| Erreur / annulation | `#C11417` (contour : `rgba(193,20,23,0.35)`) |
| Succès / confirmation | `#107046` |
| Avertissement | texte `#8C6301`, fond `#FFF3D1`, accent `#FFCC56` |
| Rayons | 8 · 12 · 16 (cartes) · 24 · 9999 (pill, dominant) |
| Boutons principaux | pill, hauteur **60 dp**, bleu plein, texte blanc 16 px gras |
| Boutons secondaires | pill, 52 dp, blanc, texte bleu, bordure 1 px |
| Boutons danger | pill, 56 dp, blanc, texte rouge, contour rouge 1,5 px |
| Champs de saisie | pill, 52 dp, blanc, bordure 1 px, padding 18 px |
| Cartes | rayon 16, bordure 1 px, ombre `0 2 8 rgba(0,21,54,0.045)` |
| Puces (dates, véhicules) | pill 44 dp ; actif = fond `#E6F2FE`, bordure et texte bleus |
| Barre d'onglets | flottante, pill, blanche, ombre `0 4 18 rgba(0,21,54,0.10)` |
| Titres | h1 30 px graisse 800 interlettrage −0,6 ; h3 18 px graisse 700 |
| Labels de section | 13 px gras, capitales, interlettrage 0,6, `#576680` |
| Avatars | toujours circulaires |
| Police | GT Eesti Pro Display, fallback Questrial |

Référence visuelle : le mockup `App/blablacar2/Covora App.dc.html` (export Claude Design).

Les fichiers de police ne sont pas fournis : tant qu'ils ne sont pas dans
`assets/fonts/`, `fonts.display` reste `undefined` et la police système est
utilisée. Ne pas inventer d'autre police.

### Ton et rédaction

- **Vouvoiement systématique.**
- Direct, rassurant, chaleureux. « Votre conducteur a annulé — voici trois
  alternatives » plutôt que « Erreur : réservation annulée ».
- Jamais de jargon technique visible par l'utilisateur, jamais de message
  d'erreur brut de Supabase affiché tel quel.
- Textes d'interface en français, code et commentaires en français également.

### Accessibilité

- Toute zone tactile : 44 dp minimum.
- Tout `Pressable` porte un `accessibilityRole` et un libellé explicite.
- Ne jamais transmettre une information par la seule couleur (ajouter un
  texte ou une icône).

---

## 5. Modèle de données

Sept tables dans le schéma `public`. Le SQL complet est dans
`supabase/migrations/`, les types TypeScript dans `src/types/database.types.ts`.

| Table | Rôle |
|---|---|
| `profiles` | 1-1 avec `auth.users`, créée automatiquement à l'inscription |
| `vehicles` | Véhicules d'un conducteur |
| `trips` | Trajets publiés — `status`: `scheduled` / `cancelled` / `completed` |
| `bookings` | Réservations — `status` inclut `cancelled_by_driver` |
| `plan_b_suggestions` | ⭐ Alternatives générées après annulation |
| `notifications` | Notifications in-app |
| `messages` | Messagerie — un fil par réservation, entre passager et conducteur |
| `avis` | **Hors migrations de ce dépôt** (créée directement dans le projet Supabase). Non utilisée par l'app ; ses clés étrangères vers profiles/trips sont en cascade depuis la migration 008 |

### Deux fonctions RPC portent la logique sensible

- **`cancel_trip(p_trip_id, p_reason)`** — le conducteur annule. La fonction
  bascule le trajet en `cancelled`, passe les réservations en
  `cancelled_by_driver`, **génère jusqu'à 3 suggestions Plan B par passager**
  (même itinéraire, départ à ±6 h, places suffisantes, classées par proximité
  horaire et tarifaire) et crée les notifications.
- **`accept_plan_b(p_suggestion_id)`** — le passager accepte une alternative :
  création de la nouvelle réservation, marquage des autres suggestions comme
  refusées, notification du nouveau conducteur.

- **`is_trip_passenger(p_trip_id)`** — vrai si l'utilisateur courant a une
  réservation (quel que soit son statut) sur ce trajet. Permet à un passager
  de lire un trajet annulé ou terminé dans Mes trajets.
- **`is_booking_participant(p_booking_id)`** — vrai si l'utilisateur courant est
  le passager de la réservation ou le conducteur du trajet. Base des politiques
  RLS de `messages` (un passager doit pouvoir écrire même si le trajet est
  annulé, donc invisible pour lui via RLS).

**Règle :** ne jamais réimplémenter cette logique côté application. Un écran
appelle `supabase.rpc('cancel_trip', …)`, il ne fait pas une série de `update`.

### Règles de cohérence tenues par la base

- `seats_available` est maintenu par un trigger sur `bookings` — **ne jamais
  le mettre à jour depuis l'application**.
- Sur `bookings`, seul le **statut** est modifiable depuis l'app, et selon le
  rôle : le passager ne peut passer qu'en `cancelled_by_passenger`, le
  conducteur en `confirmed` / `cancelled_by_driver` / `completed` (trigger
  `protect_booking_update`). Prix, places et participants sont figés.
- Sur `profiles`, `rating` et `trips_count` ne sont pas modifiables par
  l'utilisateur (trigger). La colonne `phone` n'est **pas lisible via l'API**
  (`revoke select (phone)`) : ne jamais faire `select('*')` sur `profiles`,
  toujours lister les colonnes (voir `PROFILE_FIELDS` dans AuthProvider).
- `cancel_trip` refuse un trajet déjà annulé ou déjà parti ; `accept_plan_b`
  renvoie `null` (et marque la suggestion expirée) quand le trajet est complet.
- Une suggestion Plan B survit à la suppression de la réservation annulée
  (`cancelled_booking_id` nullable, migration 008). Limite connue et acceptée :
  si un même passager perd deux conducteurs qui suppriment leur compte, ses
  suggestions « orphelines » ne sont plus distinguables et sont toutes refusées
  dès qu'il en accepte une. Cas rarissime, sans effet sur la démo.
- `seats_available <= seats_total` est une contrainte SQL.
- Un passager n'a qu'une réservation active par trajet (index unique
  partiel : une réservation annulée ne bloque pas une nouvelle réservation)
  et ne peut pas réserver son propre trajet (politique RLS).

Après toute migration, régénérer les types :

```bash
npx supabase gen types typescript --project-id <ref> > src/types/database.types.ts
```

---

## 6. Règles de sécurité — à respecter sans exception

1. **RLS activé sur toutes les tables**, sans exception. Une nouvelle table
   sans `enable row level security` et sans politique est un bug bloquant.
2. **Aucun secret dans le dépôt.** Seules les variables `EXPO_PUBLIC_*`
   existent côté app, et elles ne contiennent que l'URL du projet et la clé
   **publishable**. Le code d'une application mobile est lisible par
   n'importe qui : la sécurité repose sur RLS, pas sur le secret de la clé.
3. **Jamais la clé `service_role` dans l'application.** Elle contourne RLS.
   Si une opération l'exige, elle passe par une Edge Function.
4. **Jamais de `.env` commité.** Il est dans `.gitignore`, `.env.example`
   documente les variables attendues.
5. **Ne jamais faire confiance à un identifiant venu du client.** Une
   politique RLS compare toujours à `(select auth.uid())`, jamais à une
   valeur envoyée par l'app.
6. **Les fonctions `security definer` déclarent `set search_path = ''`** et
   leur `execute` est révoqué pour `anon`. Les fonctions de trigger ne sont
   jamais exposées via l'API REST.
7. **Aucune donnée d'un autre utilisateur ne doit pouvoir être lue.** Le test
   d'acceptation du Jour 1 est : deux comptes créés, chacun ne voit que ses
   propres réservations.
8. **Aucun message d'erreur technique affiché à l'utilisateur.** On journalise
   avec `warn()` de `src/lib/log.ts` (muet en version publiée, jamais
   `console.*` directement), on affiche une phrase compréhensible.
9. **Pas de donnée personnelle dans les logs** (e-mail, téléphone, position).
10. Après chaque migration, lancer les *advisors* Supabase (sécurité et
    performance) et corriger les alertes avant de continuer.

---

## 7. Conventions de code

- TypeScript **strict**, aucun `any`. Préférer `unknown` puis restreindre.
- Composants fonctionnels, `export function NomDuComposant()` — pas de
  `export default` sauf pour les écrans (exigé par expo-router).
- Styles via `StyleSheet.create` en bas de fichier, jamais de style inline
  autre qu'un calcul dynamique.
- Nommage : fichiers d'écrans en `kebab-case`, composants en `PascalCase`,
  fonctions et variables en `camelCase`, colonnes SQL en `snake_case`.
- Gestion d'erreur systématique sur chaque appel Supabase : `const { data,
  error } = await …` puis traitement de `error`. Jamais de `!` ni de `as`
  pour masquer un cas d'erreur.
- Les chaînes visibles par l'utilisateur sont écrites directement en français
  dans le JSX (pas de fichier de traduction à ce stade).

### Commandes

```bash
npm run start       # démarre Expo (scanner le QR code avec Expo Go)
npm run typecheck   # tsc --noEmit — doit passer avant chaque commit
```

---

## 8. Feuille de route des 4 jours

**Jour 1 — Fondations (fait)**
CLAUDE.md, navigation complète, écrans accessibles, Supabase connecté,
inscription et connexion fonctionnelles, RLS actif sur les six tables.

**Jour 2 — Parcours passager (fait)**
Recherche filtrée par villes, date et nombre de places ; carte de trajet avec
avatar, note et places restantes ; détail enrichi (profil conducteur,
véhicule, sélecteur de places, total calculé) ; « Mes trajets » avec
annulation côté passager.

**Jour 3 — Parcours conducteur et Plan B (fait)**
Publication avec sélecteur de date et d'heure maison (aucun module natif,
donc compatible Expo Go), gestion des véhicules, annulation avec choix du
motif, écran Plan B avec alternatives classées et écart de prix, écran
notifications avec compteur de non-lus sur le profil.

**Jour 4 — Finition et démonstration (à faire)**
Passe design system écran par écran, états de chargement et vides partout,
relecture accessibilité (zones tactiles, libellés), jeu de données de
démonstration (`supabase/seed.sql`), répétition du scénario complet.

**Ajouts du 22/09/2026 — arborescence BlaBlaCar (fait)**
Design system du mockup `App/blablacar2` appliqué, nom d'app « BlaBlaCar » et
icône aux couleurs de la marque, onglets Rechercher / Publier / Mes trajets /
Messages / Profil, Plan B accessible depuis Mes trajets (bannière « Trajet
annulé »), segments À venir / Passés / Annulés, messagerie par réservation
(migration `20260922_002_messages.sql`, à rejouer dans le SQL Editor puis
passer les advisors).
Revue « écran par écran » du 23/09/2026 : 17 bugs probables listés puis
corrigés — base : `20260923_005_trips_visible_to_passengers.sql` (un passager
lit les trajets qu'il a réservés, même annulés) et
`20260923_006_hardening.sql` (garde-fous cancel_trip, expiration Plan B,
statuts de réservation, note/téléphone du profil, refus seul sur les
suggestions) ; app : recherche qui garde ses filtres et exclut les trajets
partis, sélecteur 30/60 jours par pas de 30 min, places bornées par le
véhicule, message de confirmation d'e-mail à l'inscription, écarts horaires
précis, notifications cliquables, cartes annulées explicites.
Audit OWASP Mobile Top 10 du 23/09/2026 : M9 session dans SecureStore ;
M8 journaux muets en production (`warn()`), réglages Supabase à faire dans le
tableau de bord (URL de site, mot de passe ≥ 8, mots de passe compromis,
advisors) ; M6 suppression de compte (`delete_my_account`) ; M4 validations
e-mail/nom, longueurs de saisie et contraintes en base (migration 007),
jokers de recherche échappés ; M2 lockfile mis à jour, 13 alertes modérées
restantes toutes dans l'outillage de build d'Expo (non embarqué dans l'app),
corrigibles seulement par un changement de version majeure d'Expo.
Correctifs appliqués le 22/09/2026 après test de la US-01/US-02 :
`20260922_003_fix_accept_plan_b.sql` (cast enum dans `accept_plan_b`) et
`20260922_004_bookings_unique_active.sql` (unicité limitée aux réservations
actives). Les deux sont appliqués sur le projet Supabase de l'app.

---

## 9. Comment travailler avec moi

- **Avant de coder :** annoncer en deux lignes le plan et les fichiers
  touchés. Ne pas modifier plus de fichiers que nécessaire.
- **Ne jamais réécrire un fichier entier** pour changer quelques lignes.
- **Après chaque changement :** lancer `npm run typecheck`. Un échec se
  corrige immédiatement, il ne se reporte pas.
- **Ne jamais inventer une colonne, une table ou une route.** Si une donnée
  manque, écrire une migration dans `supabase/migrations/` et régénérer les
  types.
- **Ne jamais supprimer ni contourner une politique RLS** pour faire passer
  une fonctionnalité. Si une requête est bloquée, la politique est la bonne
  réponse, pas le contournement.
- **Ne pas ajouter de tests automatisés** tant que le scénario de démo n'est
  pas complet : la validation se fait sur téléphone avec Expo Go.
- En cas de doute sur une décision produit, poser **une** question précise
  plutôt que d'improviser.
