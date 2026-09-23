/**
 * Messagerie : un fil par réservation, entre le passager et le conducteur.
 * Les écrans appellent ces fonctions, jamais Supabase directement.
 */
import { supabase } from './supabase';
import type { DriverSummary } from './queries';
import type { BookingRow, MessageRow, TripRow } from '../types/database.types';

const PERSON_FIELDS = 'full_name, rating, bio, trips_count';

export type ConversationTrip = Pick<
  TripRow,
  'id' | 'origin_label' | 'destination_label' | 'departure_at' | 'status'
>;

export type Conversation = {
  bookingId: string;
  bookingStatus: BookingRow['status'];
  /** Mon rôle dans cette conversation. */
  role: 'passenger' | 'driver';
  trip: ConversationTrip;
  /** L'autre participant. */
  other: DriverSummary | null;
  lastMessage: MessageRow | null;
  unread: number;
};

type PassengerBookingRow = {
  id: string;
  status: BookingRow['status'];
  trip: (ConversationTrip & { driver: DriverSummary | null }) | null;
};

type DriverBookingRow = {
  id: string;
  status: BookingRow['status'];
  passenger: DriverSummary | null;
  trip: ConversationTrip | null;
};

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const [asPassenger, asDriver] = await Promise.all([
    supabase
      .from('bookings')
      .select(
        `id, status, trip:trips!bookings_trip_id_fkey(id, origin_label, destination_label, departure_at, status, driver:profiles!trips_driver_id_fkey(${PERSON_FIELDS}))`,
      )
      .eq('passenger_id', userId),
    supabase
      .from('bookings')
      .select(
        `id, status, passenger:profiles!bookings_passenger_id_fkey(${PERSON_FIELDS}), trip:trips!bookings_trip_id_fkey!inner(id, origin_label, destination_label, departure_at, status, driver_id)`,
      )
      .eq('trip.driver_id', userId),
  ]);
  if (asPassenger.error) throw asPassenger.error;
  if (asDriver.error) throw asDriver.error;

  const conversations: Conversation[] = [];
  for (const row of (asPassenger.data ?? []) as PassengerBookingRow[]) {
    if (!row.trip) continue;
    conversations.push({
      bookingId: row.id,
      bookingStatus: row.status,
      role: 'passenger',
      trip: row.trip,
      other: row.trip.driver,
      lastMessage: null,
      unread: 0,
    });
  }
  for (const row of (asDriver.data ?? []) as DriverBookingRow[]) {
    if (!row.trip) continue;
    conversations.push({
      bookingId: row.id,
      bookingStatus: row.status,
      role: 'driver',
      trip: row.trip,
      other: row.passenger,
      lastMessage: null,
      unread: 0,
    });
  }
  if (conversations.length === 0) return [];

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .in(
      'booking_id',
      conversations.map((c) => c.bookingId),
    )
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw error;

  const byBooking = new Map(conversations.map((c) => [c.bookingId, c]));
  for (const message of (messages ?? []) as MessageRow[]) {
    const conversation = byBooking.get(message.booking_id);
    if (!conversation) continue;
    if (!conversation.lastMessage) conversation.lastMessage = message;
    if (message.sender_id !== userId && message.read_at === null) conversation.unread += 1;
  }

  return conversations.sort((a, b) => {
    const dateA = a.lastMessage?.created_at ?? a.trip.departure_at;
    const dateB = b.lastMessage?.created_at ?? b.trip.departure_at;
    return dateB.localeCompare(dateA);
  });
}

export async function fetchMessages(bookingId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

export async function sendMessage(bookingId: string, senderId: string, body: string) {
  const { error } = await supabase
    .from('messages')
    .insert({ booking_id: bookingId, sender_id: senderId, body: body.trim() });
  if (error) throw error;
}

/** Nombre de messages reçus et non lus, toutes conversations confondues (badge de l'onglet). */
export async function fetchUnreadMessagesCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .neq('sender_id', userId)
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

/** Marque comme lus les messages reçus (jamais les miens) dans ce fil. */
export async function markConversationRead(bookingId: string, userId: string) {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .neq('sender_id', userId)
    .is('read_at', null);
  if (error) throw error;
}
