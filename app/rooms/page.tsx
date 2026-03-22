'use client'
// app/rooms/page.tsx
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Building2, Users, CheckCircle, XCircle } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { getRooms, getBookings } from '@/lib/supabase'
import type { Room, Booking } from '@/types'

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [todayBookings, setTodayBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const today = format(new Date(), 'yyyy-MM-dd')
  const nowTime = format(new Date(), 'HH:mm')

  useEffect(() => {
    Promise.all([
      getRooms(),
      getBookings({ dateFrom: today, dateTo: today }),
    ]).then(([r, b]) => {
      setRooms(r as Room[])
      setTodayBookings(b as Booking[])
    }).finally(() => setLoading(false))
  }, [today])

  function getRoomStatus(room: Room) {
    const now = nowTime
    const active = todayBookings.find(
      b => b.room_id === room.id && b.start_time <= now && b.end_time > now
    )
    if (active) return { busy: true, booking: active }
    const next = todayBookings
      .filter(b => b.room_id === room.id && b.start_time > now)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))[0]
    return { busy: false, next }
  }

  return (
    <AppShell>
      <div className="fade-up">
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Salas</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: '1.5rem' }}>
          Status em tempo real · hoje, {format(new Date(), 'dd/MM/yyyy')}
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>Carregando…</div>
        ) : (
          <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {rooms.map(room => {
              const { busy, booking, next } = getRoomStatus(room)
              return (
                <div
                  key={room.id}
                  className="card"
                  style={{ borderTop: `3px solid ${room.color}` }}
                >
                  {/* Status badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <span
                      className={`badge ${busy ? 'badge-red' : 'badge-green'}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      {busy
                        ? <><XCircle size={10} /> Ocupada agora</>
                        : <><CheckCircle size={10} /> Disponível</>
                      }
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-3)' }}>
                      <Users size={12} />
                      {room.capacity} pessoas
                    </div>
                  </div>

                  {/* Room name */}
                  <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-1)', marginBottom: 4 }}>
                    {room.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
                    {room.description}
                  </div>

                  {/* Amenities */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {room.amenities.map(a => (
                      <span key={a} className="badge badge-gray">{a}</span>
                    ))}
                  </div>

                  {/* Current / next booking */}
                  {busy && booking && (
                    <div style={{
                      background: '#FCEBEB',
                      borderRadius: 8,
                      padding: '8px 10px',
                      fontSize: 12,
                    }}>
                      <div style={{ fontWeight: 500, color: '#A32D2D' }}>{booking.title}</div>
                      <div style={{ color: '#A32D2D', opacity: 0.8 }}>
                        {booking.start_time.slice(0,5)} – {booking.end_time.slice(0,5)}
                      </div>
                    </div>
                  )}
                  {!busy && next && (
                    <div style={{
                      background: 'var(--surface-2)',
                      borderRadius: 8,
                      padding: '8px 10px',
                      fontSize: 12,
                    }}>
                      <div style={{ color: 'var(--text-3)' }}>Próxima reserva</div>
                      <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>{next.title}</div>
                      <div style={{ color: 'var(--text-2)' }}>às {next.start_time.slice(0,5)}</div>
                    </div>
                  )}
                  {!busy && !next && (
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      Livre o resto do dia
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
