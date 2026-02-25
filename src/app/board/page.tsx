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

// 每張卡片循環使用的鮮豔漸層色
const CARD_GRADIENTS = [
  'linear-gradient(135deg, #ff6b6b, #ffa94d)',
  'linear-gradient(135deg, #339af0, #74c0fc)',
  'linear-gradient(135deg, #51cf66, #a9e34b)',
  'linear-gradient(135deg, #cc5de8, #f783ac)',
  'linear-gradient(135deg, #ffd43b, #ff922b)',
  'linear-gradient(135deg, #20c997, #3bc9db)',
]

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
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #e0f7fa 0%, #fff9c4 50%, #fce4ec 100%)',
        padding: '24px 20px 40px',
        fontFamily: '"Segoe UI", "Noto Sans TC", sans-serif',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* 標題列 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 8,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(28px, 5vw, 48px)',
              fontWeight: 900,
              color: '#5c2d91',
              textShadow: '2px 3px 0 rgba(92,45,145,.18)',
              letterSpacing: 1,
            }}
          >
            🏆 家庭計分板
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(255,255,255,.7)',
              borderRadius: 999,
              padding: '6px 16px',
              fontSize: 15,
              fontWeight: 600,
              color: '#5c2d91',
              boxShadow: '0 2px 8px rgba(0,0,0,.08)',
            }}
          >
            <span style={{ opacity: 0.75 }}>{loading ? '⏳ 更新中…' : '✅ 已更新'}</span>
            <span>⭐ 總點數 {total}</span>
            <button
              onClick={load}
              style={{
                background: 'linear-gradient(135deg, #845ef7, #cc5de8)',
                color: '#fff',
                border: 'none',
                borderRadius: 999,
                padding: '5px 14px',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(132,94,247,.4)',
              }}
            >
              🔄 重新整理
            </button>
          </div>
        </div>

        {err && (
          <div
            style={{
              marginTop: 12,
              background: '#fff0f0',
              border: '2px solid #ff6b6b',
              borderRadius: 12,
              padding: '10px 16px',
              color: '#c0392b',
              fontWeight: 600,
            }}
          >
            ⚠️ 讀取失敗：{err}
          </div>
        )}

        {/* 孩子積分卡片 */}
        <div
          style={{
            marginTop: 20,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          {balances.map((b, i) => (
            <KidCard
              key={b.kid_id}
              name={b.name}
              points={b.balance}
              gradient={CARD_GRADIENTS[i % CARD_GRADIENTS.length]}
            />
          ))}
        </div>

        {/* 待執行願望 */}
        <section
          style={{
            marginTop: 28,
            background: 'rgba(255,255,255,.75)',
            borderRadius: 24,
            padding: '20px 24px',
            boxShadow: '0 4px 20px rgba(0,0,0,.08)',
          }}
        >
          <h2
            style={{
              margin: '0 0 14px',
              fontSize: 24,
              fontWeight: 900,
              color: '#e67700',
            }}
          >
            🌟 待執行願望
          </h2>
          {pending.length === 0 ? (
            <div style={{ color: '#888', fontSize: 16 }}>🎉 目前沒有待執行的兌換！</div>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pending.map((p) => (
                <li
                  key={p.id}
                  style={{
                    background: 'linear-gradient(90deg, #fff9db, #fff3bf)',
                    border: '2px solid #ffd43b',
                    borderRadius: 14,
                    padding: '10px 16px',
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#5c4400',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      background: '#ffd43b',
                      borderRadius: 999,
                      padding: '2px 12px',
                      fontWeight: 800,
                      fontSize: 15,
                      color: '#5c4400',
                    }}
                  >
                    {p.kids?.[0]?.name ?? p.kid_id}
                  </span>
                  <span>🎁 {p.rewards?.[0]?.title ?? '（未知願望）'}</span>
                  {p.rewards?.[0] && (
                    <span style={{ opacity: 0.75, fontSize: 14 }}>（{p.rewards[0].cost_points} 點）</span>
                  )}
                  {p.note && (
                    <span style={{ opacity: 0.65, fontSize: 14 }}>— 備註：{p.note}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}

function KidCard({ name, points, gradient }: { name: string; points: number; gradient: string }) {
  return (
    <div
      style={{
        background: gradient,
        borderRadius: 24,
        padding: '22px 24px',
        color: '#fff',
        boxShadow: '0 6px 24px rgba(0,0,0,.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 裝飾圓圈 */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.15)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -30,
          left: -10,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.1)',
        }}
      />
      <div style={{ fontSize: 28, fontWeight: 900, textShadow: '1px 2px 4px rgba(0,0,0,.2)' }}>
        😊 {name}
      </div>
      <div
        style={{
          fontSize: 'clamp(60px, 10vw, 88px)',
          fontWeight: 900,
          lineHeight: 1,
          textShadow: '2px 4px 8px rgba(0,0,0,.2)',
          marginTop: 4,
        }}
      >
        {points}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, opacity: 0.9 }}>⭐ 點</div>
    </div>
  )
}
