'use client'

import BoardPinGate from '@/components/BoardPinGate'
import { errMsg, getSupabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type KidBalance = { kid_id: string; name: string; sort_order: number; balance: number }

type Reward = { id: string; title: string; cost_points: number; active: boolean }

type PendingRedemption = {
  id: string
  redeemed_at: string
  kid_id: string
  status: 'pending'
  note: string | null
  kids: { name: string } | null
  rewards: { title: string; cost_points: number } | null
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
    <BoardPinGate>
      <Board />
    </BoardPinGate>
  )
}

function Board() {
  const [balances, setBalances] = useState<KidBalance[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
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

      const rw = await supabase
        .from('rewards')
        .select('id,title,cost_points,active')
        .eq('active', true)
        .order('sort_order', { ascending: true })
      if (rw.error) throw rw.error
      setRewards((rw.data ?? []) as Reward[])

      const r = await supabase
        .from('redemptions')
        .select('id,status,redeemed_at,kid_id,note,kids(name),rewards(title,cost_points)')
        .eq('status', 'pending')
        .order('redeemed_at', { ascending: false })
        .limit(20)

      if (r.error) throw r.error
      setPending((r.data ?? []) as unknown as PendingRedemption[])
    } catch (e: unknown) {
      setErr(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 10000) // simple auto-refresh for TV
    return () => clearInterval(t)
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
            <Link
              href="/history"
              style={{
                background: 'linear-gradient(135deg, #ffa94d, #ffd43b)',
                color: '#5c4400',
                borderRadius: 999,
                padding: '5px 14px',
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(255,169,77,.4)',
              }}
            >
              📋 紀錄
            </Link>
            <Link
              href="/admin"
              style={{
                background: 'linear-gradient(135deg, #20c997, #3bc9db)',
                color: '#fff',
                borderRadius: 999,
                padding: '5px 14px',
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(32,201,151,.4)',
              }}
            >
              ⚙️ 管理
            </Link>
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

        {/* 可兌換願望 */}
        <section
          style={{
            marginTop: 28,
            background: 'rgba(255,255,255,.75)',
            borderRadius: 24,
            padding: '20px 24px',
            boxShadow: '0 4px 20px rgba(0,0,0,.08)',
          }}
        >
          <h2 style={{ margin: '0 0 14px', fontSize: 24, fontWeight: 900, color: '#5c2d91' }}>🎁 可兌換願望</h2>
          {rewards.length === 0 ? (
            <div style={{ color: '#888', fontSize: 16 }}>目前沒有可兌換的願望。</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rewards.map((rw) => {
                const affordable = balances.filter((b) => b.balance >= rw.cost_points)
                return (
                  <div
                    key={rw.id}
                    style={{
                      background: 'linear-gradient(90deg, #f3f0ff, #e5dbff)',
                      border: '2px solid #cc5de8',
                      borderRadius: 14,
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: 16, color: '#5c2d91', flexGrow: 1 }}>
                      🎁 {rw.title}
                    </span>
                    <span
                      style={{
                        background: '#cc5de8',
                        color: '#fff',
                        borderRadius: 999,
                        padding: '2px 12px',
                        fontWeight: 800,
                        fontSize: 14,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ⭐ {rw.cost_points} 點
                    </span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {balances.map((b) => (
                        <span
                          key={b.kid_id}
                          style={{
                            borderRadius: 999,
                            padding: '2px 10px',
                            fontSize: 13,
                            fontWeight: 700,
                            background: b.balance >= rw.cost_points
                              ? 'linear-gradient(135deg, #51cf66, #a9e34b)'
                              : 'rgba(0,0,0,.08)',
                            color: b.balance >= rw.cost_points ? '#fff' : '#888',
                            boxShadow: b.balance >= rw.cost_points
                              ? '0 1px 4px rgba(81,207,102,.4)'
                              : 'none',
                          }}
                        >
                          {b.name} {b.balance >= rw.cost_points ? '✓' : `(${b.balance}/${rw.cost_points})`}
                        </span>
                      ))}
                    </div>
                    {affordable.length === 0 && (
                      <span style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>目前沒有孩子可兌換</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

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
            🌟 待執行願望（已兌換，待家長完成）
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
                    {p.kids?.name ?? p.kid_id}
                  </span>
                  <span>🎁 {p.rewards?.title ?? '（未知願望）'}</span>
                  {p.rewards && (
                    <span style={{ opacity: 0.75, fontSize: 14 }}>（{p.rewards.cost_points} 點）</span>
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
