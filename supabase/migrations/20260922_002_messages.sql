-- =====================================================================
-- Messagerie — un fil de discussion par réservation, entre le passager
-- et le conducteur. À rejouer dans le SQL Editor du projet Supabase.
-- =====================================================================

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_booking_created_idx on public.messages (booking_id, created_at);
create index messages_sender_id_idx on public.messages (sender_id);
alter table public.messages enable row level security;

-- Participant = passager de la réservation ou conducteur du trajet.
-- security definer : un passager ne peut pas lire un trajet annulé via RLS,
-- mais doit pouvoir continuer à écrire à son conducteur.
create or replace function public.is_booking_participant(p_booking_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1
    from public.bookings b
    join public.trips t on t.id = b.trip_id
    where b.id = p_booking_id
      and (b.passenger_id = (select auth.uid()) or t.driver_id = (select auth.uid()))
  );
$$;
revoke all on function public.is_booking_participant(uuid) from public, anon;
grant execute on function public.is_booking_participant(uuid) to authenticated;

create policy "messages_select_participants" on public.messages for select to authenticated
  using (public.is_booking_participant(booking_id));

create policy "messages_insert_own" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_booking_participant(booking_id));

-- Seul le destinataire peut marquer un message comme lu.
create policy "messages_update_by_recipient" on public.messages for update to authenticated
  using (sender_id <> (select auth.uid()) and public.is_booking_participant(booking_id))
  with check (sender_id <> (select auth.uid()) and public.is_booking_participant(booking_id));

-- Le destinataire ne peut modifier que read_at : le contenu est figé.
create or replace function public.protect_message_content()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.body <> old.body or new.sender_id <> old.sender_id or new.booking_id <> old.booking_id then
    raise exception 'Un message ne peut pas être modifié';
  end if;
  return new;
end; $$;
revoke all on function public.protect_message_content() from public, anon, authenticated;

create trigger messages_protect_content
  before update on public.messages for each row execute function public.protect_message_content();

-- Notification in-app du destinataire à chaque nouveau message.
create or replace function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_recipient uuid;
  v_sender_name text;
begin
  select case when b.passenger_id = new.sender_id then t.driver_id else b.passenger_id end
    into v_recipient
  from public.bookings b
  join public.trips t on t.id = b.trip_id
  where b.id = new.booking_id;

  select full_name into v_sender_name from public.profiles where id = new.sender_id;

  if v_recipient is not null then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_recipient, 'new_message', 'Nouveau message',
      coalesce(nullif(v_sender_name, ''), 'Un membre') || ' vous a écrit.',
      jsonb_build_object('booking_id', new.booking_id)
    );
  end if;
  return new;
end; $$;
revoke all on function public.notify_new_message() from public, anon, authenticated;

create trigger messages_notify_recipient
  after insert on public.messages for each row execute function public.notify_new_message();
