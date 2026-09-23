-- =====================================================================
-- RPC métier — toute la logique sensible vit ici, jamais dans l'app.
-- L'app appelle supabase.rpc('cancel_trip'|'accept_plan_b', ...).
-- NOTE : les deux fonctions sont redéfinies (garde-fous, expiration sans
-- exception) dans 20260923_006_hardening.sql, à rejouer après ce fichier.
-- =====================================================================

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

  update public.trips
    set status = 'cancelled', cancelled_at = now(), cancellation_reason = p_reason
  where id = p_trip_id;

  for v_booking in
    select * from public.bookings where trip_id = p_trip_id and status in ('pending', 'confirmed')
  loop
    update public.bookings
      set status = 'cancelled_by_driver', cancelled_at = now()
    where id = v_booking.id;

    -- Génération des alternatives : même itinéraire, départ à +/- 6 h,
    -- places suffisantes ; score = proximité horaire et tarifaire.
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
      and t.driver_id <> v_booking.passenger_id
      and t.seats_available >= v_booking.seats
      and t.departure_at between v_trip.departure_at - interval '6 hours'
                             and v_trip.departure_at + interval '6 hours'
      and lower(t.origin_label) = lower(v_trip.origin_label)
      and lower(t.destination_label) = lower(v_trip.destination_label)
    order by abs(extract(epoch from (t.departure_at - v_trip.departure_at))) asc
    limit 3
    on conflict do nothing;

    get diagnostics v_suggestions = row_count;

    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_booking.passenger_id, 'trip_cancelled', 'Votre conducteur a annulé',
      'Nous vous proposons des alternatives pour ce trajet.',
      jsonb_build_object('booking_id', v_booking.id, 'trip_id', p_trip_id)
    );
  end loop;

  return v_suggestions;
end; $$;

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

  if v_trip.status <> 'scheduled' or v_trip.seats_available < v_old_booking.seats then
    update public.plan_b_suggestions set status = 'expired' where id = p_suggestion_id;
    raise exception 'Ce trajet n''a plus de place disponible';
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

-- Les fonctions de trigger ne doivent pas être appelables via l'API REST.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.sync_seats_available() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

-- Les RPC métier sont réservées aux utilisateurs connectés.
revoke all on function public.cancel_trip(uuid, text) from public, anon;
revoke all on function public.accept_plan_b(uuid) from public, anon;
grant execute on function public.cancel_trip(uuid, text) to authenticated;
grant execute on function public.accept_plan_b(uuid) to authenticated;
