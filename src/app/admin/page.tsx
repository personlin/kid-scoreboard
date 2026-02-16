'use client'

import AuthGate from '@/components/AuthGate'
import { getSupabase } from '@/lib/supabaseClient'
import { useState } from 'react'

export default function AdminPage() {
  return (
    <AuthGate>
      <Admin />
    </AuthGate>
  )
}

function Admin() {
  const [msg, setMsg] = useState<string | null>(null)

  async function signOut() {
    setMsg(null)
    const supabase = getSupabase()
    const { error } = await supabase.auth.signOut()
    if (error) setMsg(error.message)
  }

  return (
    <main style={{ padding: 20, maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1>家長管理</h1>
        <button onClick={signOut}>Sign out</button>
      </div>

      <p style={{ opacity: 0.75 }}>下一步：加上「加分/扣分」與「任務每日一次」與「兌換 pending→done」。</p>

      <section style={{ marginTop: 16 }}>
        <h2>快速加扣分（示意）</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button>娜娜 +1</button>
          <button>娜娜 -1</button>
          <button>楷楷 +1</button>
          <button>楷楷 -1</button>
        </div>
      </section>

      {msg ? <div style={{ color: 'crimson', marginTop: 12 }}>{msg}</div> : null}
    </main>
  )
}
