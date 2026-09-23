-- =====================================================================
-- OWASP M6 : suppression de compte par l'utilisateur.
-- OWASP M4 : longueurs maximales imposées par la base.
-- À rejouer dans le SQL Editor.
-- =====================================================================

-- ---------- M6. delete_my_account : l'utilisateur supprime son propre compte
-- Ses trajets à venir sont d'abord annulés (les passagers sont prévenus),
-- puis le compte auth est supprimé ; le profil et ses données suivent en cascade.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_trip record;
begin
  if v_uid is null then
    raise exception 'Utilisateur non connecté';
  end if;

  for v_trip in
    select id from public.trips
    where driver_id = v_uid and status = 'scheduled' and departure_at > now()
  loop
    perform public.cancel_trip(v_trip.id, 'Compte du conducteur supprimé');
  end loop;

  delete from auth.users where id = v_uid;
end; $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- M4. Longueurs maximales (les écrans limitent déjà la saisie ;
-- la base reste la dernière ligne de défense contre un client modifié)
alter table public.profiles
  add constraint profiles_full_name_len check (char_length(full_name) <= 80),
  add constraint profiles_bio_len check (bio is null or char_length(bio) <= 500);

alter table public.vehicles
  add constraint vehicles_brand_len check (char_length(brand) between 1 and 40),
  add constraint vehicles_model_len check (char_length(model) between 1 and 40),
  add constraint vehicles_color_len check (color is null or char_length(color) <= 30);

alter table public.trips
  add constraint trips_origin_len check (char_length(origin_label) between 2 and 80),
  add constraint trips_destination_len check (char_length(destination_label) between 2 and 80),
  add constraint trips_notes_len check (notes is null or char_length(notes) <= 500);

alter table public.bookings
  add constraint bookings_message_len check (message is null or char_length(message) <= 500);
