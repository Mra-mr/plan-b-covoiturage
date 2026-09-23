-- =====================================================================
-- Jeu de données de démonstration — « Plan B »
--
-- Pré-requis : créer 3 comptes DEPUIS L'APPLICATION avec ces e-mails
--   sarah@demo.fr    (conductrice)
--   thomas@demo.fr   (passager)
--   karim@demo.fr    (conducteur de secours)
-- Le mot de passe n'a pas d'importance, mais notez-le : il vous servira
-- à basculer d'un rôle à l'autre pendant la démonstration.
--
-- Ce script est rejouable : il efface les données de démo précédentes
-- avant de les recréer.
-- =====================================================================
do $$
declare
  v_sarah uuid;
  v_thomas uuid;
  v_karim uuid;
  v_trip_sarah uuid;
  v_depart timestamptz := date_trunc('hour', now()) + interval '2 days' + interval '8 hours';
begin
  select id into v_sarah from auth.users where email = 'sarah@demo.fr';
  select id into v_thomas from auth.users where email = 'thomas@demo.fr';
  select id into v_karim from auth.users where email = 'karim@demo.fr';

  if v_sarah is null or v_thomas is null or v_karim is null then
    raise exception 'Créez d''abord les 3 comptes dans l''application (sarah@demo.fr, thomas@demo.fr, karim@demo.fr).';
  end if;

  -- Remise à zéro des données de démo
  delete from public.trips where driver_id in (v_sarah, v_karim);
  delete from public.notifications where user_id in (v_sarah, v_thomas, v_karim);

  update public.profiles
    set full_name = 'Sarah', bio = 'Nantes–Paris toutes les semaines. Ponctuelle et bavarde.', rating = 4.9
  where id = v_sarah;
  update public.profiles
    set full_name = 'Thomas', bio = 'Étudiant à Lyon, je voyage léger.', rating = 4.7
  where id = v_thomas;
  update public.profiles
    set full_name = 'Karim', bio = 'Conducteur régulier, coffre spacieux.', rating = 4.8
  where id = v_karim;

  insert into public.vehicles (driver_id, brand, model, color, seats)
  values (v_sarah, 'Peugeot', '308', 'Bleu', 5), (v_karim, 'Renault', 'Mégane', 'Gris', 5);

  -- Le trajet que Sarah va annuler pendant la démonstration
  insert into public.trips (driver_id, vehicle_id, origin_label, destination_label, departure_at,
                            seats_total, seats_available, price_cents, notes)
  values (v_sarah, (select id from public.vehicles where driver_id = v_sarah limit 1),
          'Nantes', 'Paris', v_depart, 3, 3, 2500, 'Un arrêt café à mi-parcours.')
  returning id into v_trip_sarah;

  -- Les alternatives que Plan B proposera (même itinéraire, départ proche)
  insert into public.trips (driver_id, vehicle_id, origin_label, destination_label, departure_at,
                            seats_total, seats_available, price_cents, notes)
  values
    (v_karim, (select id from public.vehicles where driver_id = v_karim limit 1),
     'Nantes', 'Paris', v_depart + interval '1 hour', 4, 4, 2700, 'Coffre spacieux, deux valises possibles.'),
    (v_karim, null, 'Nantes', 'Paris', v_depart - interval '2 hours', 3, 3, 2300, 'Départ matinal, autoroute directe.');

  -- Quelques trajets pour remplir la recherche
  insert into public.trips (driver_id, origin_label, destination_label, departure_at,
                            seats_total, seats_available, price_cents)
  values
    (v_karim, 'Lyon', 'Paris', v_depart + interval '1 day', 3, 3, 3200),
    (v_sarah, 'Paris', 'Nantes', v_depart + interval '3 days', 4, 4, 2600);

  -- Thomas réserve le trajet de Sarah
  insert into public.bookings (trip_id, passenger_id, seats, price_cents, status)
  values (v_trip_sarah, v_thomas, 1, 2500, 'confirmed');

  raise notice 'Démo prête. Trajet de Sarah à annuler : %', v_trip_sarah;
end $$;
