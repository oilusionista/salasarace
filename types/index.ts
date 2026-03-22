// types/index.ts

export interface Room {
  id: string
  name: string
  capacity: number
  description: string | null
  amenities: string[]
  color: string
  active: boolean
  created_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  role: 'admin' | 'member'
  created_at: string
}

export interface Booking {
  id: string
  room_id: string
  user_id: string
  title: string
  date: string          // 'YYYY-MM-DD'
  start_time: string    // 'HH:MM'
  end_time: string      // 'HH:MM'
  attendees: number
  notes: string | null
  alerts: string[]
  status: 'confirmed' | 'cancelled'
  created_at: string
  // joins
  room?: Room
  profile?: Profile
}

export interface BookingStats {
  room_id: string
  room_name: string
  room_color: string
  month: string
  total_bookings: number
  total_hours: number
  avg_attendees: number
}

export interface BookingFormData {
  room_id: string
  title: string
  date: string
  start_time: string
  end_time: string
  attendees: number
  notes: string
  alerts: string[]
}
