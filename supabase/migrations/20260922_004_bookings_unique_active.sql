-- =====================================================================
-- Correctif : l'unicité (trip_id, passenger_id) bloquait toute nouvelle
-- réservation après une annulation (la ligne annulée reste en base).
-- L'unicité ne porte plus que sur les réservations actives.
-- À rejouer dans le SQL Editor.
-- =====================================================================

alter table public.bookings drop constraint if exists bookings_trip_id_passenger_id_key;

create unique index if not exists bookings_active_unique
  on public.bookings (trip_id, passenger_id)
  where status in ('pending', 'confirmed', 'completed');
