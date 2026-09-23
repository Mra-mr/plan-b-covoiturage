-- =====================================================================
-- Correctifs de la revue du 23/09/2026 (bugs 2, 8, 13, 14, 15, 16).
-- À rejouer dans le SQL Editor, puis lancer les advisors.
-- =====================================================================

-- ---------- 2. cancel_trip : refuse un trajet déjà annulé ou déjà parti
create or replace function public.cancel_trip(p_trip_id uuid, p_reason text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_trip public.trips%rowtype;
  v_booking public.bookings%rowtype;
  v_suggestions integer := 0;
begin
  select * into v_trip from public.trips where id = p_trip_id;
  if not found then raise exception 'Trajet introuvable'; end if;
  if v_trip.driver_id <> auth.uid() then
    raise exception 'Seul le conducteur peut annuler ce trajet';
  end if;
  if v_trip.status <> 'scheduled' then
    raise exception 'Ce trajet est déjà annulé ou terminé';
  end if;
  if v_trip.departure_at < now() then
    raise exception 'Ce trajet est déjà parti';
  end if;

  update public.trips
    set status = 'cancelled', cancelled_at = now(), cancellation_reason = p_reason
  where id = p_trip_id;

  for v_booking in
    select * from public.bookings where trip_id = p_trip_id and status in ('pending', 'confirmed')
  loop
    update public.bookings
      set status = 'cancelled_by_driver', cancelled_at = now()
    where id = v_booking.id;

    insert into public.plan_b_suggestions (
      passenger_id, cancelled_booking_id, suggested_trip_id,
      score, reason, price_delta_cents, departure_delta_minutes, expires_at
    )
    select
      v_booking.passenger_id, v_booking.id, t.id,
      round(
        100
        - least(60, abs(extract(epoch from (t.departure_at - v_trip.departure_at)) / 60) / 6)
        - least(25, abs(t.price_cents - v_trip.price_cents) / 100.0)
      , 2),
      'Même itinéraire, départ proche',
      t.price_cents - v_trip.price_cents,
      round(extract(epoch from (t.departure_at - v_trip.departure_at)) / 60)::integer,
      now() + interval '24 hours'
    from public.trips t
    where t.id <> p_trip_id
      and t.status = 'scheduled'
      and t.departure_at > now()
      and t.driver_id <> v_booking.passenger_id
      and t.seats_available >= v_booking.seats
      and t.departure_at between v_trip.departure_at - interval '6 hours'
                             and v_trip.departure_at + interval '6 hours'
      and lower(t.origin_label) = lower(v_trip.origin_label)
      and lower(t.destination_label) = lower(v_trip.destination_label)
      and not exists (
        select 1 from public.bookings b2
        where b2.trip_id = t.id and b2.passenger_id = v_booking.passenger_id
          and b2.status in ('pending', 'confirmed', 'completed')
      )
    order by abs(extract(epoch from (t.departure_at - v_trip.departure_at))) asc
    limit 3
    on conflict do nothing;

    get diagnostics v_suggestions = row_count;

    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_booking.passenger_id, 'trip_cancelled', 'Votre conducteur a annulé',
      case when v_suggestions > 0
        then 'Nous vous proposons des alternatives pour ce trajet.'
        else 'Aucune alternative immédiate : relancez une recherche.' end,
      jsonb_build_object('booking_id', v_booking.id, 'trip_id', p_trip_id)
    );
  end loop;

  return v_suggestions;
end; $$;

-- ---------- 8. accept_plan_b : l'expiration est enregistrée (retour null au lieu d'une exception)
create or replace function public.accept_plan_b(p_suggestion_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_suggestion public.plan_b_suggestions%rowtype;
  v_old_booking public.bookings%rowtype;
  v_trip public.trips%rowtype;
  v_new_booking_id uuid;
begin
  select * into v_suggestion from public.plan_b_suggestions where id = p_suggestion_id;
  if not found or v_suggestion.passenger_id <> auth.uid() then
    raise exception 'Suggestion introuvable';
  end if;
  if v_suggestion.status <> 'proposed' then
    raise exception 'Cette alternative n''est plus disponible';
  end if;

  select * into v_old_booking from public.bookings where id = v_suggestion.cancelled_booking_id;
  select * into v_trip from public.trips where id = v_suggestion.suggested_trip_id for update;

  if v_trip.status <> 'scheduled' or v_trip.departure_at < now()
     or v_trip.seats_available < v_old_booking.seats then
    -- Pas d'exception : l'expiration doit être conservée en base.
    update public.plan_b_suggestions set status = 'expired' where id = p_suggestion_id;
    return null;
  end if;

  insert into public.bookings (trip_id, passenger_id, seats, price_cents, status)
  values (v_trip.id, v_suggestion.passenger_id, v_old_booking.seats,
          v_trip.price_cents * v_old_booking.seats, 'confirmed')
  returning id into v_new_booking_id;

  update public.plan_b_suggestions
    set status = case
      when id = p_suggestion_id then 'accepted'::public.plan_b_status
      else 'declined'::public.plan_b_status
    end
  where cancelled_booking_id = v_suggestion.cancelled_booking_id and status = 'proposed';

  insert into public.notifications (user_id, type, title, body, data)
  values (v_trip.driver_id, 'new_booking', 'Nouvelle réservation',
          'Un passager a rejoint votre trajet via Plan B.',
          jsonb_build_object('trip_id', v_trip.id, 'booking_id', v_new_booking_id));

  return v_new_booking_id;
end; $$;

revoke all on function public.cancel_trip(uuid, text) from public, anon;
revoke all on function public.accept_plan_b(uuid) from public, anon;
grant execute on function public.cancel_trip(uuid, text) to authenticated;
grant execute on function public.accept_plan_b(uuid) to authenticated;

-- ---------- 13. bookings : seul le statut peut changer, et selon le rôle
create or replace function public.protect_booking_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_driver uuid;
begin
  -- Exécution interne (fonctions RPC, seed, dashboard) : pas d'utilisateur, on laisse passer.
  if v_uid is null then return new; end if;

  if new.trip_id <> old.trip_id or new.passenger_id <> old.passenger_id
     or new.seats <> old.seats or new.price_cents <> old.price_cents
     or new.created_at <> old.created_at then
    raise exception 'Seul le statut d''une réservation peut être modifié';
  end if;

  select driver_id into v_driver from public.trips where id = new.trip_id;

  if new.status = old.status then
    return new;
  elsif v_uid = old.passenger_id and new.status = 'cancelled_by_passenger'
        and old.status in ('pending', 'confirmed') then
    return new;
  elsif v_uid = v_driver and new.status in ('confirmed', 'cancelled_by_driver', 'completed')
        and old.status in ('pending', 'confirmed') then
    return new;
  end if;

  raise exception 'Changement de statut non autorisé';
end; $$;
revoke all on function public.protect_booking_update() from public, anon, authenticated;

drop trigger if exists bookings_protect_update on public.bookings;
create trigger bookings_protect_update
  before update on public.bookings for each row execute function public.protect_booking_update();

-- ---------- 14. profiles : la note et le compteur de trajets ne sont pas modifiables par l'utilisateur
create or replace function public.protect_profile_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null
     and (new.rating <> old.rating or new.trips_count <> old.trips_count) then
    raise exception 'La note et le nombre de trajets ne sont pas modifiables';
  end if;
  return new;
end; $$;
revoke all on function public.protect_profile_update() from public, anon, authenticated;

drop trigger if exists profiles_protect_update on public.profiles;
create trigger profiles_protect_update
  before update on public.profiles for each row execute function public.protect_profile_update();

-- ---------- 15. profiles.phone : jamais lisible via l'API
-- Un revoke sur une seule colonne est sans effet tant que le droit de lecture
-- sur la table entière existe : on retire le droit global et on le redonne
-- colonne par colonne, sans phone. Conséquence : plus aucun select('*') sur
-- profiles depuis l'app (voir PROFILE_FIELDS dans AuthProvider).
revoke select on public.profiles from anon, authenticated;
grant select (id, full_name, avatar_url, bio, rating, trips_count, created_at, updated_at)
  on public.profiles to anon, authenticated;

-- ---------- 16. plan_b_suggestions : le passager ne peut que refuser (l'acceptation passe par la RPC)
drop policy if exists "plan_b_update_own" on public.plan_b_suggestions;
create policy "plan_b_update_own" on public.plan_b_suggestions for update to authenticated
  using (passenger_id = (select auth.uid()) and status = 'proposed')
  with check (passenger_id = (select auth.uid()) and status = 'declined');
