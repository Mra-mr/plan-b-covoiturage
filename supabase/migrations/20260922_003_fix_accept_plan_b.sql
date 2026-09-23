-- =====================================================================
-- Correctif : accept_plan_b échouait sur l'affectation d'un CASE (typé text)
-- à la colonne status (enum plan_b_status). Casts explicites ajoutés.
-- À rejouer dans le SQL Editor.
-- =====================================================================

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

revoke all on function public.accept_plan_b(uuid) from public, anon;
grant execute on function public.accept_plan_b(uuid) to authenticated;
