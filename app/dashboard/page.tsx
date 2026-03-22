'use client'
// app/dashboard/page.tsx
import { useState, useEffect, useCallback } from 'react'
import { format, startOfWeek, addDays, addWeeks, subWeeks, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { getBookings, getRooms } from '@/lib/supabase'
import type { Booking, Room } from '@/types'

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8) // 8..18

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export default function DashboardPage() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [activeRooms, setActiveRooms] = useState<Set<string>>(new Set())

  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))
  const dateFrom = format(weekStart, 'yyyy-MM-dd')
  const dateTo = format(addDays(weekStart, 4), 'yyyy-MM-dd')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [b, r] = await Promise.all([
        getBookings({ dateFrom, dateTo }),
        getRooms(),
      ])
      setBookings(b as Booking[])
      setRooms(r as Room[])
      if (activeRooms.size === 0) setActiveRooms(new Set(r.map((x: Room) => x.id)))
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo]) // eslint-disable-line

  useEffect(() => { load() }, [load])

  const toggleRoom = (id: string) => {
    setActiveRooms(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const PX_PER_MIN = 480 / (10 * 60) // 480px for 10h (8-18)
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()

  return (
    <AppShell>
      <div className="fade-up">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 500 }}>Calendário</h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
              Visão semanal das reservas
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-secondary btn-icon" onClick={() => setWeekStart(w => subWeeks(w, 1))}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 500, minWidth: 160, textAlign: 'center' }}>
              {format(weekStart, "d 'de' MMM", { locale: ptBR })} –{' '}
              {format(addDays(weekStart, 4), "d 'de' MMM", { locale: ptBR })}
            </span>
            <button className="btn btn-secondary btn-icon" onClick={() => setWeekStart(w => addWeeks(w, 1))}>
              <ChevronRight size={16} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              Hoje
            </button>
            <Link href="/book" className="btn btn-primary btn-sm">
              <Plus size={14} /> Nova reserva
            </Link>
          </div>
        </div>

        {/* Room filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => toggleRoom(room.id)}
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                border: `1.5px solid ${activeRooms.has(room.id) ? room.color : 'var(--border-md)'}`,
                background: activeRooms.has(room.id) ? `${room.color}18` : 'transparent',
                color: activeRooms.has(room.id) ? room.color : 'var(--text-3)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {room.name.split('—')[0].trim()}
            </button>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '52px repeat(5, 1fr)',
              minWidth: 600,
            }}>
              {/* Header row */}
              <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', height: 44 }} />
              {weekDays.map(day => (
                <div
                  key={day.toISOString()}
                  style={{
                    background: 'var(--surface-2)',
                    borderBottom: '1px solid var(--border)',
                    borderLeft: '1px solid var(--border)',
                    padding: '8px 0',
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: isToday(day) ? 600 : 400,
                    color: isToday(day) ? 'var(--accent)' : 'var(--text-2)',
                  }}
                >
                  {format(day, 'EEE', { locale: ptBR })}
                  <br />
                  <span style={{ fontSize: 14, fontWeight: isToday(day) ? 600 : 500, color: isToday(day) ? 'var(--accent)' : 'var(--text-1)' }}>
                    {format(day, 'd')}
                  </span>
                </div>
              ))}

              {/* Body */}
              <div style={{ display: 'contents' }}>
                {/* Time labels column */}
                <div style={{ position: 'relative', height: 480, borderRight: '1px solid var(--border)' }}>
                  {HOURS.map(h => (
                    <div
                      key={h}
                      style={{
                        position: 'absolute',
                        top: (h - 8) * 60 * PX_PER_MIN,
                        right: 8,
                        fontSize: 10,
                        color: 'var(--text-3)',
                        lineHeight: 1,
                      }}
                    >
                      {h}:00
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {weekDays.map(day => {
                  const dayStr = format(day, 'yyyy-MM-dd')
                  const dayBookings = bookings.filter(
                    b => b.date === dayStr && activeRooms.has(b.room_id)
                  )
                  const todayStr = format(new Date(), 'yyyy-MM-dd')

                  return (
                    <div
                      key={dayStr}
                      style={{
                        position: 'relative',
                        height: 480,
                        borderLeft: '1px solid var(--border)',
                        cursor: 'pointer',
                        background: isToday(day) ? 'rgba(29,158,117,0.02)' : undefined,
                      }}
                    >
                      {/* Hour lines */}
                      {HOURS.map(h => (
                        <div
                          key={h}
                          style={{
                            position: 'absolute',
                            left: 0, right: 0,
                            top: (h - 8) * 60 * PX_PER_MIN,
                            borderTop: '1px solid var(--border)',
                            opacity: 0.6,
                          }}
                        />
                      ))}

                      {/* Now line */}
                      {dayStr === todayStr && nowMin >= 480 && nowMin <= 1080 && (
                        <div style={{
                          position: 'absolute',
                          left: 0, right: 0,
                          top: (nowMin - 480) * PX_PER_MIN,
                          height: 2,
                          background: '#E24B4A',
                          zIndex: 10,
                        }}>
                          <div style={{
                            width: 8, height: 8,
                            borderRadius: '50%',
                            background: '#E24B4A',
                            position: 'absolute',
                            left: -4, top: -3,
                          }} />
                        </div>
                      )}

                      {/* Booking blocks */}
                      {dayBookings.map(b => {
                        const top = (timeToMin(b.start_time) - 480) * PX_PER_MIN
                        const height = Math.max(22, (timeToMin(b.end_time) - timeToMin(b.start_time)) * PX_PER_MIN)
                        const room = rooms.find(r => r.id === b.room_id)
                        return (
                          <Link
                            key={b.id}
                            href={`/bookings/${b.id}`}
                            style={{
                              position: 'absolute',
                              top, left: 3, right: 3, height,
                              borderRadius: 6,
                              background: `${room?.color ?? '#888'}22`,
                              borderLeft: `3px solid ${room?.color ?? '#888'}`,
                              padding: '3px 6px',
                              overflow: 'hidden',
                              textDecoration: 'none',
                              cursor: 'pointer',
                              transition: 'opacity 0.15s',
                            }}
                            title={b.title}
                          >
                            <div style={{ fontSize: 11, fontWeight: 500, color: room?.color, lineHeight: 1.3 }}>
                              {b.title}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>
                              {b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)', fontSize: 13 }}>
            Carregando…
          </div>
        )}
      </div>
    </AppShell>
  )
}
