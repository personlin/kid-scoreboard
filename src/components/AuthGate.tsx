'use client'

import { useEffect, useState } from 'react'
import { getSupabase, hasSupabaseEnv } from '@/lib/supabaseClient'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let mounted = true

    async function init() {
      if (!hasSupabaseEnv) {
        setAuthed(false)
        setLoading(false)
        return
      }
      const supabase = getSupabase()
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setAuthed(!!data.session)
      setLoading(false)
    }

    init()

    if (!hasSupabaseEnv) return

    const supabase = getSupabase()
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setAuthed(!!session)
      setLoading(false)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
          <div style={{ color: '#888', fontWeight: 600 }}>載入中…</div>
        </div>
      </main>
    )
  }

  if (!hasSupabaseEnv) {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⚙️</div>
          <h2 style={titleStyle}>尚未設定</h2>
          <p style={{ color: '#666', fontSize: 14, lineHeight: 1.6 }}>
            缺少 <code style={codeStyle}>NEXT_PUBLIC_SUPABASE_URL</code> ／{' '}
            <code style={codeStyle}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>。
          </p>
          <p style={{ color: '#666', fontSize: 14 }}>
            請複製 <code style={codeStyle}>.env.local.example</code> 為{' '}
            <code style={codeStyle}>.env.local</code> 並填入設定值。
          </p>
        </div>
      </main>
    )
  }

  if (!authed) {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 44, marginBottom: 4 }}>🔐</div>
          <h1 style={titleStyle}>家長登入</h1>
          <p style={{ color: '#777', fontSize: 14, marginBottom: 20 }}>
            登入後可查看計分板與管理頁面
          </p>
          <EmailLogin />
        </div>
      </main>
    )
  }

  return <>{children}</>
}

// ── 共用樣式 ───────────────────────────────────────
const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(160deg, #e0f7fa 0%, #fff9c4 50%, #fce4ec 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 20px',
  fontFamily: '"Segoe UI", "Noto Sans TC", sans-serif',
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,.88)',
  borderRadius: 28,
  padding: '36px 40px',
  boxShadow: '0 8px 32px rgba(0,0,0,.10)',
  width: '100%',
  maxWidth: 400,
  textAlign: 'center',
}

const titleStyle: React.CSSProperties = {
  margin: '0 0 4px',
  fontSize: 24,
  fontWeight: 900,
  color: '#5c2d91',
}

const codeStyle: React.CSSProperties = {
  background: '#f3f0ff',
  borderRadius: 6,
  padding: '1px 6px',
  fontSize: 12,
  color: '#845ef7',
  fontFamily: 'monospace',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '2px solid #dee2e6',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 15,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  marginTop: 4,
  background: '#fafafa',
}

function EmailLogin() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setLoading(true)
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    setLoading(false)
    if (error) setMsg(error.message)
  }

  return (
    <form onSubmit={signIn} style={{ display: 'grid', gap: 14, textAlign: 'left' }}>
      <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 700, fontSize: 13, color: '#495057', gap: 2 }}>
        電子郵件
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          placeholder="parent@example.com"
          autoComplete="email"
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 700, fontSize: 13, color: '#495057', gap: 2 }}>
        密碼
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          style={inputStyle}
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: 4,
          background: loading ? '#adb5bd' : 'linear-gradient(135deg, #845ef7, #cc5de8)',
          color: '#fff',
          border: 'none',
          borderRadius: 999,
          padding: '12px',
          fontWeight: 800,
          fontSize: 16,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          boxShadow: loading ? 'none' : '0 3px 10px rgba(132,94,247,.4)',
          transition: 'background .2s',
        }}
      >
        {loading ? '登入中…' : '🔓 登入'}
      </button>
      {msg && (
        <div style={{ background: '#fff0f0', border: '2px solid #ff6b6b', borderRadius: 10, padding: '8px 14px', color: '#c0392b', fontWeight: 600, fontSize: 13 }}>
          ⚠️ {msg}
        </div>
      )}
    </form>
  )
}
