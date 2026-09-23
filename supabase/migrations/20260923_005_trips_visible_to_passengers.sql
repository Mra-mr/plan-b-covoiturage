-- =====================================================================
-- Correctif : un passager doit pouvoir lire les trajets qu'il a réservés
-- même une fois annulés ou terminés (écran Mes trajets, segments Annulés
-- et Passés). Fonction security definer pour éviter la récursion entre
-- les politiques de trips et de bookings. À rejouer dans le SQL Editor.
-- =====================================================================

create or replace function public.is_trip_passenger(p_trip_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.bookings b
    where b.trip_id = p_trip_id and b.passenger_id = (select auth.uid())
  );
$$;
revoke all on function public.is_trip_passenger(uuid) from public, anon;
grant execute on function public.is_trip_passenger(uuid) to authenticated;

drop policy if exists "trips_select_authenticated" on public.trips;
create policy "trips_select_authenticated" on public.trips for select to authenticated
  using (
    status = 'scheduled'
    or driver_id = (select auth.uid())
    or public.is_trip_passenger(id)
  );
