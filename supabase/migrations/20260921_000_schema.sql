-- =====================================================================
-- Plan B — schéma complet (déjà appliqué sur le projet Supabase lié).
-- Ordre : types -> profiles -> vehicles/trips -> bookings -> plan B -> RPC.
-- =====================================================================

create type public.trip_status as enum ('scheduled', 'cancelled', 'completed');
create type public.booking_status as enum ('pending', 'confirmed', 'cancelled_by_passenger', 'cancelled_by_driver', 'completed');
create type public.plan_b_status as enum ('proposed', 'accepted', 'declined', 'expired');

-- ---------- profils -------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  bio text,
  phone text,
  rating numeric(2,1) not null default 5.0 check (rating >= 0 and rating <= 5),
  trips_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_touch_updated_at
  before update on public.profiles for each row execute function public.touch_updated_at();

-- ---------- véhicules -----------------------------------------------
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  brand text not null,
  model text not null,
  color text,
  seats integer not null default 4 check (seats between 1 and 8),
  created_at timestamptz not null default now()
);
create index vehicles_driver_id_idx on public.vehicles (driver_id);
alter table public.vehicles enable row level security;

create policy "vehicles_select_authenticated" on public.vehicles for select to authenticated using (true);
create policy "vehicles_insert_own" on public.vehicles for insert to authenticated
  with check ((select auth.uid()) = driver_id);
create policy "vehicles_update_own" on public.vehicles for update to authenticated
  using ((select auth.uid()) = driver_id) with check ((select auth.uid()) = driver_id);
create policy "vehicles_delete_own" on public.vehicles for delete to authenticated
  using ((select auth.uid()) = driver_id);

-- ---------- trajets --------------------------------------------------
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  origin_label text not null,
  origin_lat double precision,
  origin_lng double precision,
  destination_label text not null,
  destination_lat double precision,
  destination_lng double precision,
  departure_at timestamptz not null,
  duration_minutes integer,
  seats_total integer not null check (seats_total between 1 and 8),
  seats_available integer not null check (seats_available >= 0),
  price_cents integer not null check (price_cents >= 0),
  instant_booking boolean not null default true,
  notes text,
  status public.trip_status not null default 'scheduled',
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_seats_coherent check (seats_available <= seats_total)
);
create index trips_driver_id_idx on public.trips (driver_id);
create index trips_vehicle_id_idx on public.trips (vehicle_id);
create index trips_search_idx on public.trips (departure_at, status);
create trigger trips_touch_updated_at before update on public.trips
  for each row execute function public.touch_updated_at();
alter table public.trips enable row level security;

-- Un passager garde la lecture des trajets qu'il a réservés (annulés ou
-- terminés compris) : voir is_trip_passenger dans 20260923_005.
create policy "trips_select_authenticated" on public.trips for select to authenticated
  using (status = 'scheduled' or driver_id = (select auth.uid()));
create policy "trips_insert_own" on public.trips for insert to authenticated
  with check ((select auth.uid()) = driver_id);
create policy "trips_update_own" on public.trips for update to authenticated
  using ((select auth.uid()) = driver_id) with check ((select auth.uid()) = driver_id);
create policy "trips_delete_own" on public.trips for delete to authenticated
  using ((select auth.uid()) = driver_id);

-- ---------- réservations ---------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  passenger_id uuid not null references public.profiles (id) on delete cascade,
  seats integer not null default 1 check (seats between 1 and 4),
  price_cents integer not null check (price_cents >= 0),
  status public.booking_status not null default 'confirmed',
  message text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Un passager n'a qu'une réservation ACTIVE par trajet ; une réservation
-- annulée ne bloque pas une nouvelle réservation (Plan B ou directe).
create unique index bookings_active_unique on public.bookings (trip_id, passenger_id)
  where status in ('pending', 'confirmed', 'completed');
create index bookings_trip_id_idx on public.bookings (trip_id);
create index bookings_passenger_id_idx on public.bookings (passenger_id);
create trigger bookings_touch_updated_at before update on public.bookings
  for each row execute function public.touch_updated_at();
alter table public.bookings enable row level security;

create policy "bookings_select_involved" on public.bookings for select to authenticated
  using (
    passenger_id = (select auth.uid())
    or exists (select 1 from public.trips t where t.id = bookings.trip_id and t.driver_id = (select auth.uid()))
  );
create policy "bookings_insert_own" on public.bookings for insert to authenticated
  with check (
    passenger_id = (select auth.uid())
    and exists (
      select 1 from public.trips t
      where t.id = trip_id and t.status = 'scheduled'
        and t.driver_id <> (select auth.uid()) and t.seats_available >= bookings.seats
    )
  );
create policy "bookings_update_involved" on public.bookings for update to authenticated
  using (
    passenger_id = (select auth.uid())
    or exists (select 1 from public.trips t where t.id = bookings.trip_id and t.driver_id = (select auth.uid()))
  )
  with check (
    passenger_id = (select auth.uid())
    or exists (select 1 from public.trips t where t.id = bookings.trip_id and t.driver_id = (select auth.uid()))
  );

create or replace function public.sync_seats_available()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  active_statuses public.booking_status[] := array['pending', 'confirmed', 'completed']::public.booking_status[];
begin
  if tg_op = 'INSERT' then
    if new.status = any (active_statuses) then
      update public.trips set seats_available = seats_available - new.seats where id = new.trip_id;
    end if;
  elsif tg_op = 'UPDATE' then
    if (old.status = any (active_statuses)) and not (new.status = any (active_statuses)) then
      update public.trips set seats_available = least(seats_total, seats_available + old.seats) where id = new.trip_id;
    elsif not (old.status = any (active_statuses)) and (new.status = any (active_statuses)) then
      update public.trips set seats_available = greatest(0, seats_available - new.seats) where id = new.trip_id;
    end if;
  end if;
  return new;
end; $$;

create trigger bookings_sync_seats after insert or update on public.bookings
  for each row execute function public.sync_seats_available();

-- ---------- Plan B + notifications -----------------------------------
create table public.plan_b_suggestions (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.profiles (id) on delete cascade,
  cancelled_booking_id uuid not null references public.bookings (id) on delete cascade,
  suggested_trip_id uuid not null references public.trips (id) on delete cascade,
  score numeric(5,2) not null default 0,
  reason text,
  price_delta_cents integer not null default 0,
  departure_delta_minutes integer not null default 0,
  status public.plan_b_status not null default 'proposed',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (cancelled_booking_id, suggested_trip_id)
);
create index plan_b_passenger_idx on public.plan_b_suggestions (passenger_id, status);
create index plan_b_booking_idx on public.plan_b_suggestions (cancelled_booking_id);
create index plan_b_trip_idx on public.plan_b_suggestions (suggested_trip_id);
alter table public.plan_b_suggestions enable row level security;

create policy "plan_b_select_own" on public.plan_b_suggestions for select to authenticated
  using (passenger_id = (select auth.uid()));
-- Le passager ne peut que refuser une suggestion ; l'acceptation passe par
-- la RPC accept_plan_b (politique resserrée dans 20260923_006_hardening.sql).
create policy "plan_b_update_own" on public.plan_b_suggestions for update to authenticated
  using (passenger_id = (select auth.uid()) and status = 'proposed')
  with check (passenger_id = (select auth.uid()) and status = 'declined');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications_update_own" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
