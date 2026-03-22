'use client'
// components/AppShell.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays, PlusCircle, ListChecks,
  BarChart3, Building2, LogOut, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const NAV = [
  { href: '/dashboard', icon: CalendarDays,  label: 'Calendário' },
  { href: '/book',      icon: PlusCircle,    label: 'Nova Reserva' },
  { href: '/bookings',  icon: ListChecks,    label: 'Reservas' },
  { href: '/reports',   icon: BarChart3,     label: 'Relatórios' },
  { href: '/rooms',     icon: Building2,     label: 'Salas' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1rem',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 40,
        transform: open ? 'translateX(0)' : undefined,
        transition: 'transform 0.2s',
      }} className="sidebar">
        {/* Logo */}
        <div style={{ marginBottom: '2rem', paddingLeft: 8 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--text-1)',
          }}>
            espaç<span style={{ color: 'var(--accent)' }}>o</span>
          </span>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>gestão de salas</div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  color: active ? 'var(--accent)' : 'var(--text-2)',
                  background: active ? 'var(--teal-50)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.12s',
                }}
                className="nav-link"
              >
                <Icon size={16} strokeWidth={active ? 2 : 1.5} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <button
          className="btn btn-ghost"
          style={{ justifyContent: 'flex-start', gap: 10, fontSize: 13 }}
          onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
        >
          <LogOut size={16} strokeWidth={1.5} />
          Sair
        </button>
      </aside>

      {/* Mobile topbar */}
      <div style={{
        display: 'none',
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 52,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
        zIndex: 50,
      }} className="mobile-bar">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 500 }}>
          espaç<span style={{ color: 'var(--accent)' }}>o</span>
        </span>
        <button className="btn btn-icon btn-ghost" onClick={() => setOpen(o => !o)}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Main */}
      <main style={{
        flex: 1,
        marginLeft: 220,
        padding: '2rem',
        maxWidth: '100%',
      }} className="main-content">
        {children}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .mobile-bar { display: flex !important; }
          .main-content { margin-left: 0 !important; padding-top: 4rem !important; }
        }
        .nav-link:hover {
          background: var(--surface-2) !important;
          color: var(--text-1) !important;
        }
      `}</style>
    </div>
  )
}
