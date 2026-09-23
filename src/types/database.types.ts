/**
 * Types de la base Supabase.
 * Régénérer après toute migration :
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TripStatus = 'scheduled' | 'cancelled' | 'completed';
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled_by_passenger'
  | 'cancelled_by_driver'
  | 'completed';
export type PlanBStatus = 'proposed' | 'accepted' | 'declined' | 'expired';

export type ProfileRow = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  rating: number;
  trips_count: number;
  created_at: string;
  updated_at: string;
}

export type VehicleRow = {
  id: string;
  driver_id: string;
  brand: string;
  model: string;
  color: string | null;
  seats: number;
  created_at: string;
}

export type TripRow = {
  id: string;
  driver_id: string;
  vehicle_id: string | null;
  origin_label: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_label: string;
  destination_lat: number | null;
  destination_lng: number | null;
  departure_at: string;
  duration_minutes: number | null;
  seats_total: number;
  seats_available: number;
  price_cents: number;
  instant_booking: boolean;
  notes: string | null;
  status: TripStatus;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type BookingRow = {
  id: string;
  trip_id: string;
  passenger_id: string;
  seats: number;
  price_cents: number;
  status: BookingStatus;
  message: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PlanBSuggestionRow = {
  id: string;
  passenger_id: string;
  cancelled_booking_id: string;
  suggested_trip_id: string;
  score: number;
  reason: string | null;
  price_delta_cents: number;
  departure_delta_minutes: number;
  status: PlanBStatus;
  expires_at: string | null;
  created_at: string;
}

export type MessageRow = {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Json;
  read_at: string | null;
  created_at: string;
}

type Rel<Fk extends string, Col extends string, Ref extends string> = {
  foreignKeyName: Fk;
  columns: [Col];
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: ['id'];
};

type Table<Row, Required extends keyof Row, Relationships extends readonly unknown[] = []> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: Relationships;
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      profiles: Table<ProfileRow, 'id'>;
      vehicles: Table<
        VehicleRow,
        'driver_id' | 'brand' | 'model',
        [Rel<'vehicles_driver_id_fkey', 'driver_id', 'profiles'>]
      >;
      trips: Table<
        TripRow,
        | 'driver_id'
        | 'origin_label'
        | 'destination_label'
        | 'departure_at'
        | 'seats_total'
        | 'seats_available'
        | 'price_cents',
        [
          Rel<'trips_driver_id_fkey', 'driver_id', 'profiles'>,
          Rel<'trips_vehicle_id_fkey', 'vehicle_id', 'vehicles'>,
        ]
      >;
      bookings: Table<
        BookingRow,
        'trip_id' | 'passenger_id' | 'price_cents',
        [
          Rel<'bookings_trip_id_fkey', 'trip_id', 'trips'>,
          Rel<'bookings_passenger_id_fkey', 'passenger_id', 'profiles'>,
        ]
      >;
      plan_b_suggestions: Table<
        PlanBSuggestionRow,
        'passenger_id' | 'cancelled_booking_id' | 'suggested_trip_id',
        [
          Rel<'plan_b_suggestions_suggested_trip_id_fkey', 'suggested_trip_id', 'trips'>,
          Rel<'plan_b_suggestions_cancelled_booking_id_fkey', 'cancelled_booking_id', 'bookings'>,
          Rel<'plan_b_suggestions_passenger_id_fkey', 'passenger_id', 'profiles'>,
        ]
      >;
      notifications: Table<
        NotificationRow,
        'user_id' | 'type' | 'title',
        [Rel<'notifications_user_id_fkey', 'user_id', 'profiles'>]
      >;
      messages: Table<
        MessageRow,
        'booking_id' | 'sender_id' | 'body',
        [
          Rel<'messages_booking_id_fkey', 'booking_id', 'bookings'>,
          Rel<'messages_sender_id_fkey', 'sender_id', 'profiles'>,
        ]
      >;
    };
    Views: Record<string, never>;
    Functions: {
      cancel_trip: { Args: { p_trip_id: string; p_reason?: string }; Returns: number };
      accept_plan_b: { Args: { p_suggestion_id: string }; Returns: string };
      is_booking_participant: { Args: { p_booking_id: string }; Returns: boolean };
      is_trip_passenger: { Args: { p_trip_id: string }; Returns: boolean };
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: {
      trip_status: TripStatus;
      booking_status: BookingStatus;
      plan_b_status: PlanBStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
