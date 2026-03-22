'use client'
// app/login/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        })
        if (error) throw error
        setInfo('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: '-0.03em',
            color: 'var(--text-1)',
          }}>
            espaç<span style={{ color: 'var(--accent)' }}>o</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            gestão de salas · coworking
          </div>
        </div>

        <div className="card" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: '1.25rem', textAlign: 'center' }}>
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </h2>

          {error && (
            <div style={{
              background: 'var(--red-50)', border: '1px solid #F7C1C1',
              borderRadius: 8, padding: '10px 12px', marginBottom: '1rem',
              fontSize: 13, color: 'var(--red-800)',
            }}>
              {error}
            </div>
          )}
          {info && (
            <div style={{
              background: 'var(--teal-50)', border: '1px solid var(--teal-100)',
              borderRadius: 8, padding: '10px 12px', marginBottom: '1rem',
              fontSize: 13, color: 'var(--teal-800)',
            }}>
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">Nome completo</label>
                <input
                  className="form-input"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', marginTop: 4, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: 13, color: 'var(--text-3)' }}>
            {mode === 'login' ? (
              <>Não tem conta?{' '}
                <button
                  onClick={() => setMode('signup')}
                  style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
                >
                  Cadastrar
                </button>
              </>
            ) : (
              <>Já tem conta?{' '}
                <button
                  onClick={() => setMode('login')}
                  style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
                >
                  Entrar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
