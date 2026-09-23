-- =====================================================================
-- Suppression de compte : deux compléments relevés en vérification.
--
-- 1. La table `avis` (créée hors des migrations de ce dépôt) référence
--    profiles et trips sans cascade : la suppression d'un compte échouait
--    dès qu'un avis existait. Ses clés étrangères sont recréées avec
--    `on delete cascade`, sans présumer de ses colonnes.
-- 2. Quand un conducteur supprime son compte, ses trajets et les
--    réservations de ses passagers disparaissent en cascade, et avec
--    elles les alternatives Plan B tout juste générées. La suggestion
--    ne dépend plus de la réservation annulée (référence mise à null
--    au lieu d'être supprimée) : le passager garde ses alternatives.
-- À rejouer dans le SQL Editor.
-- =====================================================================

-- ---------- 1. avis : cascade vers profiles et trips
do $$
declare
  r record;
begin
  if to_regclass('public.avis') is null then
    raise notice 'Table public.avis absente : rien à faire';
    return;
  end if;

  for r in
    select c.conname,
           pg_get_constraintdef(c.oid) as def
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'avis' and c.contype = 'f'
      and c.confrelid in ('public.profiles'::regclass, 'public.trips'::regclass)
      and pg_get_constraintdef(c.oid) not ilike '%on delete cascade%'
  loop
    execute format('alter table public.avis drop constraint %I', r.conname);
    execute format('alter table public.avis add constraint %I %s on delete cascade',
                   r.conname, regexp_replace(r.def, '\s+on delete\s+\w+(\s+\w+)?', '', 'i'));
    raise notice 'Contrainte % recréée avec cascade', r.conname;
  end loop;
end $$;

-- ---------- 2. Les alternatives Plan B survivent à la disparition de la réservation annulée
alter table public.plan_b_suggestions
  alter column cancelled_booking_id drop not null;

alter table public.plan_b_suggestions
  drop constraint if exists plan_b_suggestions_cancelled_booking_id_fkey;
alter table public.plan_b_suggestions
  add constraint plan_b_suggestions_cancelled_booking_id_fkey
  foreign key (cancelled_booking_id) references public.bookings (id) on delete set null;

-- accept_plan_b : si la réservation d'origine n'existe plus, une place par défaut
create or replace function public.accept_plan_b(p_suggestion_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_suggestion public.plan_b_suggestions%rowtype;
  v_seats integer := 1;
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

  if v_suggestion.cancelled_booking_id is not null then
    select seats into v_seats from public.bookings where id = v_suggestion.cancelled_booking_id;
    v_seats := coalesce(v_seats, 1);
  end if;

  select * into v_trip from public.trips where id = v_suggestion.suggested_trip_id for update;

  if v_trip.status <> 'scheduled' or v_trip.departure_at < now()
     or v_trip.seats_available < v_seats then
    update public.plan_b_suggestions set status = 'expired' where id = p_suggestion_id;
    return null;
  end if;

  insert into public.bookings (trip_id, passenger_id, seats, price_cents, status)
  values (v_trip.id, v_suggestion.passenger_id, v_seats, v_trip.price_cents * v_seats, 'confirmed')
  returning id into v_new_booking_id;

  -- Les autres alternatives de la même annulation sont refusées ; si la
  -- réservation d'origine a disparu, on refuse les autres propositions
  -- « orphelines » du même passager pour le même créneau.
  update public.plan_b_suggestions
    set status = case
      when id = p_suggestion_id then 'accepted'::public.plan_b_status
      else 'declined'::public.plan_b_status
    end
  where status = 'proposed'
    and passenger_id = v_suggestion.passenger_id
    and (
      (v_suggestion.cancelled_booking_id is not null and cancelled_booking_id = v_suggestion.cancelled_booking_id)
      or (v_suggestion.cancelled_booking_id is null and cancelled_booking_id is null)
    );

  insert into public.notifications (user_id, type, title, body, data)
  values (v_trip.driver_id, 'new_booking', 'Nouvelle réservation',
          'Un passager a rejoint votre trajet via Plan B.',
          jsonb_build_object('trip_id', v_trip.id, 'booking_id', v_new_booking_id));

  return v_new_booking_id;
end; $$;
revoke all on function public.accept_plan_b(uuid) from public, anon;
grant execute on function public.accept_plan_b(uuid) to authenticated;
