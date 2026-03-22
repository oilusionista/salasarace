// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase instance (use in components)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// -------------------------------------------------------
// Rooms
// -------------------------------------------------------
export async function getRooms() {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('active', true)
    .order('name')
  if (error) throw error
  return data
}

// -------------------------------------------------------
// Bookings
// -------------------------------------------------------
export async function getBookings(filters?: {
  dateFrom?: string
  dateTo?: string
  roomId?: string
  userId?: string
}) {
  let query = supabase
    .from('bookings')
    .select('*, room:rooms(*), profile:profiles(*)')
    .eq('status', 'confirmed')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (filters?.dateFrom) query = query.gte('date', filters.dateFrom)
  if (filters?.dateTo)   query = query.lte('date', filters.dateTo)
  if (filters?.roomId)   query = query.eq('room_id', filters.roomId)
  if (filters?.userId)   query = query.eq('user_id', filters.userId)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function checkConflict(
  roomId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_booking_conflict', {
    p_room_id:    roomId,
    p_date:       date,
    p_start_time: startTime,
    p_end_time:   endTime,
    p_exclude_id: excludeId ?? null,
  })
  if (error) throw error
  return data as boolean
}

export async function createBooking(payload: {
  room_id: string
  user_id: string
  title: string
  date: string
  start_time: string
  end_time: string
  attendees: number
  notes?: string
  alerts: string[]
}) {
  // Double-check conflict server-side before inserting
  const conflict = await checkConflict(
    payload.room_id,
    payload.date,
    payload.start_time,
    payload.end_time
  )
  if (conflict) throw new Error('Conflito de horário: esta sala já está reservada neste período.')

  const { data, error } = await supabase
    .from('bookings')
    .insert(payload)
    .select('*, room:rooms(*)')
    .single()
  if (error) throw error
  return data
}

export async function cancelBooking(bookingId: string) {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
  if (error) throw error
}

// -------------------------------------------------------
// Reports / Analytics
// -------------------------------------------------------
export async function getBookingStats(monthsBack = 6) {
  const from = new Date()
  from.setMonth(from.getMonth() - monthsBack)

  const { data, error } = await supabase
    .from('booking_stats')
    .select('*')
    .gte('month', from.toISOString())
    .order('month', { ascending: true })
  if (error) throw error
  return data
}

export async function getTopUsers(limit = 10) {
  const { data, error } = await supabase
    .from('bookings')
    .select('user_id, profile:profiles(full_name, email), count:id')
    .eq('status', 'confirmed')
    .limit(limit)
  if (error) throw error
  return data
}

// -------------------------------------------------------
// ICS Export helper
// -------------------------------------------------------
export function generateICS(booking: {
  title: string
  date: string
  start_time: string
  end_time: string
  room?: { name: string }
  notes?: string | null
}): string {
  const fmt = (d: string, t: string) =>
    `${d.replace(/-/g, '')}T${t.replace(':', '')}00`

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CoworkingApp//PT',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(booking.date, booking.start_time)}`,
    `DTEND:${fmt(booking.date, booking.end_time)}`,
    `SUMMARY:${booking.title}`,
    `LOCATION:${booking.room?.name ?? ''}`,
    booking.notes ? `DESCRIPTION:${booking.notes}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
}
