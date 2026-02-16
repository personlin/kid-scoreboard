'use client'

import AuthGate from '@/components/AuthGate'
import { getSupabase } from '@/lib/supabaseClient'
import { useEffect, useMemo, useState } from 'react'

type KidBalance = { kid_id: string; name: string; sort_order: number; balance: number }

type PendingRedemption = {
  id: string
  redeemed_at: string
  kid_id: string
  status: 'pending'
  note: string | null
  kids: { name: string }[] | null
  rewards: { title: string; cost_points: number }[] | null
}

export default function BoardPage() {
  return (
    <AuthGate>
      <Board />
    </AuthGate>
  )
}

function Board() {
  const [balances, setBalances] = useState<KidBalance[]>([])
  const [pending, setPending] = useState<PendingRedemption[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setErr(null)
    setLoading(true)
    try {
      const supabase = getSupabase()

      const b = await supabase
        .from('kid_balances')
        .select('kid_id,name,sort_order,balance')
        .order('sort_order', { ascending: true })

      if (b.error) throw b.error
      setBalances((b.data ?? []) as KidBalance[])

      const r = await supabase
        .from('redemptions')
        .select('id,status,redeemed_at,kid_id,note,kids(name),rewards(title,cost_points)')
        .eq('status', 'pending')
        .order('redeemed_at', { ascending: false })
        .limit(20)

      if (r.error) throw r.error
      setPending((r.data ?? []) as PendingRedemption[])
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 10000) // simple auto-refresh for TV
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const total = useMemo(() => balances.reduce((a, x) => a + (x.balance ?? 0), 0), [balances])

  return (
    <main style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>家庭計分板</h1>
        <div style={{ opacity: 0.7, fontSize: 14 }}>
          {loading ? '更新中…' : '已更新'} · 總點數 {total}
          <button onClick={load} style={{ marginLeft: 10 }}>
            重新整理
          </button>
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 12, color: 'crimson' }}>讀取失敗：{err}</div>
      ) : null}

      <div
        style={{
          marginTop: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        {balances.map((b) => (
          <KidCard key={b.kid_id} name={b.name} points={b.balance} />
        ))}
      </div>

      <section style={{ marginTop: 22 }}>
        <h2 style={{ marginBottom: 8 }}>待執行願望</h2>
        {pending.length === 0 ? (
          <div style={{ opacity: 0.7 }}>目前沒有待執行的兌換。</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {pending.map((p) => (
              <li key={p.id} style={{ marginBottom: 6 }}>
                <b>{p.kids?.[0]?.name ?? p.kid_id}</b>：{p.rewards?.[0]?.title ?? '（未知願望）'}
                {p.rewards?.[0] ? `（${p.rewards[0].cost_points} 點）` : ''}
                {p.note ? ` — 備註：${p.note}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function KidCard({ name, points }: { name: string; points: number }) {
  return (
    <div style={{ border: '1px solid rgba(127,127,127,.25)', borderRadius: 16, padding: 18 }}>
      <div style={{ fontSize: 24, fontWeight: 850 }}>{name}</div>
      <div style={{ fontSize: 64, fontWeight: 900, marginTop: 6, lineHeight: 1 }}>{points}</div>
      <div style={{ opacity: 0.7, marginTop: 2 }}>點</div>
    </div>
  )
}
