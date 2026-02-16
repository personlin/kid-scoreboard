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

    if (!hasSupabaseEnv) {
      return
    }

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

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>

  if (!hasSupabaseEnv) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Setup required</h2>
        <p>Missing <code>NEXT_PUBLIC_SUPABASE_URL</code> / <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.</p>
        <p>Copy <code>.env.example</code> to <code>.env.local</code> (local) or set env vars in Vercel.</p>
      </div>
    )
  }

  if (!authed) {
    return (
      <div style={{ padding: 16, maxWidth: 520 }}>
        <h2>家長登入</h2>
        <p style={{ opacity: 0.75 }}>請使用 Supabase Auth 登入後才能查看看板/管理。</p>
        <EmailLogin />
      </div>
    )
  }

  return <>{children}</>
}

function EmailLogin() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)

    // Password login (simplest). You can switch to magic link later.
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (error) setMsg(error.message)
  }

  return (
    <form onSubmit={signIn} style={{ display: 'grid', gap: 8 }}>
      <label>
        Email
        <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%' }} />
      </label>
      <label>
        Password
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} style={{ width: '100%' }} />
      </label>
      <button type="submit">Sign in</button>
      {msg ? <div style={{ color: 'crimson' }}>{msg}</div> : null}
    </form>
  )
}
