'use client'
// app/reports/page.tsx
import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Download, TrendingUp, Clock, Users, Building2 } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { getBookings, getRooms } from '@/lib/supabase'
import type { Booking, Room } from '@/types'

function timeToH(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h + m / 60
}

export default function ReportsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(3) // months back

  useEffect(() => {
    const from = format(startOfMonth(subMonths(new Date(), period)), 'yyyy-MM-dd')
    const to = format(endOfMonth(new Date()), 'yyyy-MM-dd')
    Promise.all([getBookings({ dateFrom: from, dateTo: to }), getRooms()])
      .then(([b, r]) => {
        setBookings(b as Booking[])
        setRooms(r as Room[])
      })
      .finally(() => setLoading(false))
  }, [period])

  // ---- Metrics ----
  const totalBookings = bookings.length
  const totalHours = bookings.reduce((acc, b) => acc + (timeToH(b.end_time) - timeToH(b.start_time)), 0)
  const totalAttendees = bookings.reduce((acc, b) => acc + b.attendees, 0)

  // Bookings per room (pie)
  const byRoom = rooms.map(r => ({
    name: r.name.split('—')[0].trim(),
    value: bookings.filter(b => b.room_id === r.id).length,
    color: r.color,
  })).filter(x => x.value > 0)

  // Bookings per month (bar)
  const months = Array.from({ length: period + 1 }, (_, i) => {
    const d = subMonths(new Date(), period - i)
    return format(startOfMonth(d), 'yyyy-MM')
  })
  const byMonth = months.map(m => ({
    month: format(new Date(m + '-15'), "MMM/yy", { locale: ptBR }),
    reservas: bookings.filter(b => b.date.startsWith(m)).length,
    horas: Math.round(bookings.filter(b => b.date.startsWith(m)).reduce((a, b) => a + (timeToH(b.end_time) - timeToH(b.start_time)), 0)),
  }))

  // Busiest hours
  const byHour = Array.from({ length: 10 }, (_, i) => {
    const h = i + 8
    const count = bookings.filter(b => {
      const start = timeToH(b.start_time)
      const end = timeToH(b.end_time)
      return start <= h && end > h
    }).length
    return { hora: `${h}h`, reservas: count }
  })

  // Weekday distribution
  const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']
  const byWeekday = weekdays.map((label, i) => ({
    dia: label,
    reservas: bookings.filter(b => {
      const d = new Date(b.date + 'T12:00:00')
      return d.getDay() === (i + 1)
    }).length,
  }))

  const exportCSV = () => {
    const header = ['Data', 'Sala', 'Título', 'Início', 'Término', 'Horas', 'Participantes']
    const rows = bookings.map(b => {
      const room = rooms.find(r => r.id === b.room_id)
      const hours = (timeToH(b.end_time) - timeToH(b.start_time)).toFixed(1)
      return [b.date, room?.name ?? '', b.title, b.start_time, b.end_time, hours, b.attendees]
    })
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `relatorio-coworking-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const CUSTOM_TOOLTIP = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: 'var(--text-2)' }}>{p.dataKey}: <strong>{p.value}</strong></div>
        ))}
      </div>
    )
  }

  if (loading) {
    return <AppShell><div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>Carregando relatórios…</div></AppShell>
  }

  return (
    <AppShell>
      <div className="fade-up">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 500 }}>Relatórios</h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
              Análise de ocupação e uso das salas
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              className="form-input"
              style={{ width: 'auto' }}
              value={period}
              onChange={e => setPeriod(Number(e.target.value))}
            >
              <option value={1}>Último mês</option>
              <option value={3}>Últimos 3 meses</option>
              <option value={6}>Últimos 6 meses</option>
              <option value={12}>Último ano</option>
            </select>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
              <Download size={14} /> Exportar CSV
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
          {[
            { icon: TrendingUp, label: 'Reservas', value: totalBookings, color: 'var(--accent)' },
            { icon: Clock, label: 'Horas totais', value: `${totalHours.toFixed(0)}h`, color: '#378ADD' },
            { icon: Users, label: 'Participantes', value: totalAttendees, color: '#7F77DD' },
            { icon: Building2, label: 'Salas ativas', value: rooms.length, color: '#BA7517' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon size={16} color={color} />
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 500, color: 'var(--text-1)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Reservas por mês */}
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem', color: 'var(--text-1)' }}>Reservas por mês</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byMonth} barSize={28}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Bar dataKey="reservas" fill="var(--accent)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Por sala (pie) */}
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem', color: 'var(--text-1)' }}>Uso por sala</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byRoom} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={3}>
                  {byRoom.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} reservas`]} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Horas por dia da semana */}
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem', color: 'var(--text-1)' }}>Distribuição por dia da semana</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byWeekday} barSize={24}>
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Bar dataKey="reservas" fill="#7F77DD" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Horários mais usados */}
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem', color: 'var(--text-1)' }}>Pico de ocupação por horário</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={byHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="hora" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Line type="monotone" dataKey="reservas" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ranking de salas */}
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem', color: 'var(--text-1)' }}>Ranking de salas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rooms.map(room => {
              const count = bookings.filter(b => b.room_id === room.id).length
              const hours = bookings.filter(b => b.room_id === room.id).reduce((a, b) => a + (timeToH(b.end_time) - timeToH(b.start_time)), 0)
              const pct = totalBookings ? Math.round((count / totalBookings) * 100) : 0
              return (
                <div key={room.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: room.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13, color: 'var(--text-1)' }}>{room.name.split('—')[0].trim()}</div>
                  <div style={{ flex: 2 }}>
                    <div style={{ background: 'var(--surface-2)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: room.color, borderRadius: 4, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 80, textAlign: 'right' }}>
                    {count} res · {hours.toFixed(0)}h
                  </div>
                  <span className="badge badge-gray" style={{ minWidth: 36, justifyContent: 'center' }}>{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
