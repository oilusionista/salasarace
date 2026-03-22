'use client'
// app/bookings/page.tsx
import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Download, Trash2, Search, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { getBookings, cancelBooking, getRooms, generateICS } from '@/lib/supabase'
import type { Booking, Room } from '@/types'

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRoom, setFilterRoom] = useState('')
  const [filterStatus, setFilterStatus] = useState('upcoming')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [b, r] = await Promise.all([getBookings(), getRooms()])
      setBookings(b as Booking[])
      setRooms(r as Room[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const today = format(new Date(), 'yyyy-MM-dd')

  const filtered = bookings.filter(b => {
    if (filterRoom && b.room_id !== filterRoom) return false
    if (filterStatus === 'upcoming' && b.date < today) return false
    if (filterStatus === 'past' && b.date >= today) return false
    if (search) {
      const q = search.toLowerCase()
      const room = rooms.find(r => r.id === b.room_id)
      if (!b.title.toLowerCase().includes(q) && !room?.name.toLowerCase().includes(q)) return false
    }
    return true
  })

  const handleCancel = async (id: string) => {
    if (!confirm('Cancelar esta reserva?')) return
    await cancelBooking(id)
    setBookings(prev => prev.filter(b => b.id !== id))
  }

  const handleExport = (b: Booking) => {
    const room = rooms.find(r => r.id === b.room_id)
    const ics = generateICS({ ...b, start_time: b.start_time, end_time: b.end_time, room })
    const blob = new Blob([ics], { type: 'text/calendar' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `reserva-${b.id.slice(0, 8)}.ics`
    a.click()
  }

  const exportCSV = () => {
    const header = ['Data', 'Sala', 'Título', 'Início', 'Término', 'Participantes', 'Notas']
    const rows = filtered.map(b => {
      const room = rooms.find(r => r.id === b.room_id)
      return [b.date, room?.name ?? '', b.title, b.start_time, b.end_time, b.attendees, b.notes ?? '']
    })
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `reservas-${today}.csv`
    a.click()
  }

  return (
    <AppShell>
      <div className="fade-up">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 500 }}>Reservas</h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
              {filtered.length} reserva{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
              <Download size={14} /> Exportar CSV
            </button>
            <Link href="/book" className="btn btn-primary btn-sm">+ Nova Reserva</Link>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 32 }}
              placeholder="Buscar reserva…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="form-input" style={{ width: 'auto' }} value={filterRoom} onChange={e => setFilterRoom(e.target.value)}>
            <option value="">Todas as salas</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name.split('—')[0].trim()}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="upcoming">Próximas</option>
            <option value="past">Anteriores</option>
            <option value="all">Todas</option>
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)', fontSize: 13 }}>Carregando…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>
            <CalendarDays size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Nenhuma reserva encontrada.</p>
            <Link href="/book" className="btn btn-primary btn-sm" style={{ marginTop: 16, display: 'inline-flex' }}>
              Criar primeira reserva
            </Link>
          </div>
        ) : (
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(b => {
              const room = rooms.find(r => r.id === b.room_id)
              const dt = new Date(b.date + 'T12:00:00')
              const isPast = b.date < today
              return (
                <div
                  key={b.id}
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    opacity: isPast ? 0.7 : 1,
                    padding: '14px 16px',
                  }}
                >
                  {/* Color bar */}
                  <div style={{
                    width: 4,
                    height: 44,
                    borderRadius: 2,
                    background: room?.color ?? '#888',
                    flexShrink: 0,
                  }} />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                      {room?.name} · {format(dt, "EEE d 'de' MMM", { locale: ptBR })} · {b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}
                    </div>
                    {b.alerts.length > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                        🔔 {b.alerts.join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Badge */}
                  <span className={`badge ${isPast ? 'badge-gray' : 'badge-green'}`}>
                    {isPast ? 'Realizada' : 'Confirmada'}
                  </span>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleExport(b)} title="Exportar .ics">
                      <Download size={12} />
                    </button>
                    {!isPast && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleCancel(b.id)} title="Cancelar">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
