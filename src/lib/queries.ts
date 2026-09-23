/**
 * Accès aux données. Les écrans appellent ces fonctions : aucune requête
 * Supabase n'est écrite directement dans un composant d'interface.
 */
import { supabase } from './supabase';
import type {
  BookingRow,
  NotificationRow,
  PlanBSuggestionRow,
  ProfileRow,
  TripRow,
  VehicleRow,
} from '../types/database.types';

export type DriverSummary = Pick<ProfileRow, 'full_name' | 'rating' | 'bio' | 'trips_count'>;
export type TripWithDriver = TripRow & { driver: DriverSummary | null };
export type TripDetail = TripWithDriver & { vehicle: VehicleRow | null };
export type BookingWithTrip = BookingRow & { trip: TripWithDriver | null };
export type SuggestionWithTrip = PlanBSuggestionRow & { trip: TripWithDriver | null };

const DRIVER_FIELDS = 'full_name, rating, bio, trips_count';

export type SearchFilters = {
  origin?: string;
  destination?: string;
  /** Jour recherché ; si absent, tous les trajets à venir. */
  date?: Date | null;
  seats?: number;
};

export async function searchTrips(filters: SearchFilters): Promise<TripWithDriver[]> {
  let query = supabase
    .from('trips')
    .select(`*, driver:profiles!trips_driver_id_fkey(${DRIVER_FIELDS})`)
    .eq('status', 'scheduled')
    .gte('seats_available', filters.seats ?? 1)
    .order('departure_at', { ascending: true })
    .limit(40);

  if (filters.date) {
    const start = new Date(filters.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const lowerBound = new Date(Math.max(start.getTime(), Date.now()));
    query = query.gte('departure_at', lowerBound.toISOString()).lt('departure_at', end.toISOString());
  } else {
    query = query.gte('departure_at', new Date().toISOString());
  }

  if (filters.origin?.trim()) query = query.ilike('origin_label', `%${filters.origin.trim()}%`);
  if (filters.destination?.trim()) {
    query = query.ilike('destination_label', `%${filters.destination.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TripWithDriver[];
}

export async function fetchTrip(id: string): Promise<TripDetail | null> {
  const { data, error } = await supabase
    .from('trips')
    .select(
      `*, driver:profiles!trips_driver_id_fkey(${DRIVER_FIELDS}), vehicle:vehicles!trips_vehicle_id_fkey(*)`,
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as TripDetail | null;
}

export async function bookTrip(tripId: string, passengerId: string, seats: number, priceCents: number) {
  const { error } = await supabase.from('bookings').insert({
    trip_id: tripId,
    passenger_id: passengerId,
    seats,
    price_cents: priceCents * seats,
    status: 'confirmed',
  });
  if (error) throw error;
}

export async function fetchMyBookings(passengerId: string): Promise<BookingWithTrip[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`*, trip:trips(*, driver:profiles!trips_driver_id_fkey(${DRIVER_FIELDS}))`)
    .eq('passenger_id', passengerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BookingWithTrip[];
}

export async function cancelMyBooking(bookingId: string) {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled_by_passenger', cancelled_at: new Date().toISOString() })
    .eq('id', bookingId);
  if (error) throw error;
}

export async function fetchMyTrips(driverId: string): Promise<TripRow[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('driver_id', driverId)
    .order('departure_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TripRow[];
}

export async function fetchTripPassengers(tripId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`*, passenger:profiles!bookings_passenger_id_fkey(${DRIVER_FIELDS})`)
    .eq('trip_id', tripId)
    .in('status', ['pending', 'confirmed']);
  if (error) throw error;
  return (data ?? []) as (BookingRow & { passenger: DriverSummary | null })[];
}

export type NewTrip = {
  driverId: string;
  vehicleId: string | null;
  origin: string;
  destination: string;
  departureAt: Date;
  seats: number;
  priceEuros: number;
  notes: string;
};

export async function publishTrip(trip: NewTrip) {
  const { error } = await supabase.from('trips').insert({
    driver_id: trip.driverId,
    vehicle_id: trip.vehicleId,
    origin_label: trip.origin.trim(),
    destination_label: trip.destination.trim(),
    departure_at: trip.departureAt.toISOString(),
    seats_total: trip.seats,
    seats_available: trip.seats,
    price_cents: Math.round(trip.priceEuros * 100),
    notes: trip.notes.trim() || null,
  });
  if (error) throw error;
}

/** Annulation conducteur : déclenche la génération des alternatives Plan B. */
export async function cancelTrip(tripId: string, reason: string) {
  const { error } = await supabase.rpc('cancel_trip', { p_trip_id: tripId, p_reason: reason });
  if (error) throw error;
}

export async function fetchSuggestions(passengerId: string): Promise<SuggestionWithTrip[]> {
  const { data, error } = await supabase
    .from('plan_b_suggestions')
    .select(
      `*, trip:trips!plan_b_suggestions_suggested_trip_id_fkey(*, driver:profiles!trips_driver_id_fkey(${DRIVER_FIELDS}))`,
    )
    .eq('passenger_id', passengerId)
    .eq('status', 'proposed')
    .order('score', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SuggestionWithTrip[];
}

export async function acceptSuggestion(suggestionId: string) {
  const { data, error } = await supabase.rpc('accept_plan_b', { p_suggestion_id: suggestionId });
  if (error) throw error;
  // La fonction renvoie null quand le trajet n'a plus de place : elle a déjà
  // marqué la suggestion comme expirée.
  if (!data) throw new Error("Ce trajet n'a plus de place disponible");
}

/** Identifiants des trajets rejoints via Plan B, pour le badge « Réservé via Plan B ». */
export async function fetchAcceptedPlanBTripIds(passengerId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('plan_b_suggestions')
    .select('suggested_trip_id')
    .eq('passenger_id', passengerId)
    .eq('status', 'accepted');
  if (error) throw error;
  return (data ?? []).map((row) => row.suggested_trip_id);
}

export async function declineSuggestion(suggestionId: string) {
  const { error } = await supabase
    .from('plan_b_suggestions')
    .update({ status: 'declined' })
    .eq('id', suggestionId);
  if (error) throw error;
}

export async function fetchNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function markNotificationsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw error;
}

export async function fetchVehicles(driverId: string): Promise<VehicleRow[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as VehicleRow[];
}

export async function addVehicle(driverId: string, brand: string, model: string, color: string, seats: number) {
  const { error } = await supabase.from('vehicles').insert({
    driver_id: driverId,
    brand: brand.trim(),
    model: model.trim(),
    color: color.trim() || null,
    seats,
  });
  if (error) throw error;
}

export async function deleteVehicle(vehicleId: string) {
  const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
  if (error) throw error;
}

export async function updateProfile(userId: string, patch: Partial<Pick<ProfileRow, 'full_name' | 'bio'>>) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}
