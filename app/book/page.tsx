'use client'
// app/book/page.tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle, Calendar, Clock } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { getRooms, createBooking, checkConflict, generateICS, supabase } from '@/lib/supabase'
import type { Room } from '@/types'
import { format } from 'date-fns'

const TIMES = Array.from({ length: 21 }, (_, i) => {
  const total = 480 + i * 30 // 08:00 start, 30min steps
  const h = Math.floor(total / 60).toString().padStart(2, '0')
  const m = (total % 60).toString().padStart(2, '0')
  return `${h}:${m}`
})

const ALERT_OPTIONS = [
  { value: '15min', label: '15 min antes' },
  { value: '30min', label: '30 min antes' },
  { value: '1h',    label: '1h antes' },
  { value: '1d',    label: '1 dia antes' },
]

export default function BookPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [form, setForm] = useState({
    room_id: '',
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '10:00',
    attendees: 1,
    notes: '',
    alerts: ['30min'],
  })
  const [conflict, setConflict] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getRooms().then(r => setRooms(r as Room[]))
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  // Live conflict detection
  useEffect(() => {
    if (!form.room_id || !form.date || !form.start_time || !form.end_time) return
    checkConflict(form.room_id, form.date, form.start_time, form.end_time)
      .then(setConflict)
      .catch(() => setConflict(false))
  }, [form.room_id, form.date, form.start_time, form.end_time])

  const set = (key: string, val: unknown) => setForm(f => ({ ...f, [key]: val }))

  const toggleAlert = (val: string) => {
    setForm(f => ({
      ...f,
      alerts: f.alerts.includes(val) ? f.alerts.filter(a => a !== val) : [...f.alerts, val],
    }))
  }

  const handleSubmit = async () => {
    if (!userId) { setError('Faça login para reservar.'); return }
    if (!form.room_id || !form.title || !form.date) { setError('Preencha sala, título e data.'); return }
    if (conflict) { setError('Resolva o conflito de horário antes de confirmar.'); return }

    setLoading(true)
    setError('')
    try {
      await createBooking({ ...form, user_id: userId })
      setSuccess(true)
      setTimeout(() => router.push('/bookings'), 1500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar reserva.')
    } finally {
      setLoading(false)
    }
  }

  const selectedRoom = rooms.find(r => r.id === form.room_id)

  const handleExportGoogle = () => {
    const dtFmt = (d: string, t: string) =>
      `${d.replace(/-/g, '')}T${t.replace(':', '')}00`
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(form.title)}&dates=${dtFmt(form.date, form.start_time)}/${dtFmt(form.date, form.end_time)}&details=${encodeURIComponent(form.notes)}&location=${encodeURIComponent(selectedRoom?.name ?? '')}`
    window.open(url, '_blank')
  }

  const handleExportICS = () => {
    const ics = generateICS({ ...form, room: selectedRoom })
    const blob = new Blob([ics], { type: 'text/calendar' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'reserva.ics'
    a.click()
  }

  if (success) {
    return (
      <AppShell>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 16 }}>
          <CheckCircle size={48} color="var(--accent)" />
          <h2 style={{ fontSize: 20, fontWeight: 500 }}>Reserva confirmada!</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Redirecionando para suas reservas…</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="fade-up" style={{ maxWidth: 680 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Nova Reserva</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: '1.5rem' }}>
          O sistema verifica conflitos automaticamente antes de confirmar.
        </p>

        {/* Conflict warning */}
        {conflict && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--red-50)', border: '1px solid #F7C1C1',
            borderRadius: 10, padding: '10px 14px', marginBottom: '1rem',
          }}>
            <AlertTriangle size={16} color="var(--red-800)" />
            <span style={{ fontSize: 13, color: 'var(--red-800)' }}>
              Esta sala já está reservada neste horário. Escolha outro horário ou sala.
            </span>
          </div>
        )}

        {error && (
          <div style={{
            background: 'var(--red-50)', border: '1px solid #F7C1C1',
            borderRadius: 10, padding: '10px 14px', marginBottom: '1rem',
            fontSize: 13, color: 'var(--red-800)',
          }}>
            {error}
          </div>
        )}

        <div className="card stagger" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Room */}
          <div className="form-group">
            <label className="form-label">Sala *</label>
            <select className="form-input" value={form.room_id} onChange={e => set('room_id', e.target.value)}>
              <option value="">Selecione uma sala</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} — até {r.capacity} pessoas
                </option>
              ))}
            </select>
            {selectedRoom && (
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {selectedRoom.amenities.map(a => (
                  <span key={a} className="badge badge-gray">{a}</span>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Título / pauta *</label>
            <input
              className="form-input"
              type="text"
              placeholder="Ex: Reunião de planejamento Q3"
              value={form.title}
              onChange={e => set('title', e.target.value)}
            />
          </div>

          {/* Date + Attendees */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Data *</label>
              <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Participantes</label>
              <input
                className="form-input"
                type="number"
                min={1}
                max={selectedRoom?.capacity ?? 99}
                value={form.attendees}
                onChange={e => set('attendees', Number(e.target.value))}
              />
            </div>
          </div>

          {/* Times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Início</label>
              <select className="form-input" value={form.start_time} onChange={e => set('start_time', e.target.value)}>
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Término</label>
              <select className="form-input" value={form.end_time} onChange={e => set('end_time', e.target.value)}>
                {TIMES.filter(t => t > form.start_time).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Informações adicionais, equipamentos necessários…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Alerts */}
          <div className="form-group">
            <label className="form-label">Alertas de lembrete</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ALERT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleAlert(opt.value)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    border: `1px solid ${form.alerts.includes(opt.value) ? 'var(--accent)' : 'var(--border-md)'}`,
                    background: form.alerts.includes(opt.value) ? 'var(--teal-50)' : 'transparent',
                    color: form.alerts.includes(opt.value) ? 'var(--teal-800)' : 'var(--text-2)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar export */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--surface-2)',
            borderRadius: 10,
            padding: '12px 14px',
          }}>
            <Calendar size={18} color="var(--text-3)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>Exportar para agenda</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Adicione ao calendário nativo do seu celular</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-secondary btn-sm" onClick={handleExportGoogle}>Google</button>
              <button className="btn btn-secondary btn-sm" onClick={handleExportICS}>Apple / .ics</button>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button className="btn btn-secondary" onClick={() => router.back()}>Cancelar</button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading || conflict}
              style={{ opacity: (loading || conflict) ? 0.6 : 1 }}
            >
              <Clock size={14} />
              {loading ? 'Salvando…' : 'Confirmar Reserva'}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
