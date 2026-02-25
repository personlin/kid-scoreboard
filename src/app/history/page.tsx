'use client'

import AuthGate from '@/components/AuthGate'
import { getSupabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type Kid = { id: string; name: string; sort_order: number }

type PointLog = {
  id: string
  kid_id: string
  delta: number
  reason: string
  note: string | null
  created_at: string
  tasks: { title: string }[] | null
}

type Redemption = {
  id: string
  kid_id: string
  redeemed_at: string
  done_at: string | null
  status: string
  note: string | null
  rewards: { title: string; cost_points: number }[] | null
}

export default function HistoryPage() {
  return (
    <AuthGate>
      <History />
    </AuthGate>
  )
}

function History() {
  const [kids, setKids] = useState<Kid[]>([])
  const [selectedKid, setSelectedKid] = useState<string>('')
  const [pointLogs, setPointLogs] = useState<PointLog[]>([])
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadKids() {
    try {
      const supabase = getSupabase()
      const k = await supabase.from('kids').select('id,name,sort_order').order('sort_order', { ascending: true })
      if (k.error) throw k.error
      const kk = (k.data ?? []) as Kid[]
      setKids(kk)
      if (!selectedKid && kk[0]?.id) setSelectedKid(kk[0].id)
    } catch (e: unknown) {
      setErr((e instanceof Error ? e.message : String(e)) ?? 'Unknown error')
    }
  }

  async function loadHistory(kidId: string) {
    if (!kidId) return
    setErr(null)
    setLoading(true)
    try {
      const supabase = getSupabase()

      const pl = await supabase
        .from('point_logs')
        .select('id,kid_id,delta,reason,note,created_at,tasks(title)')
        .eq('kid_id', kidId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (pl.error) throw pl.error
      setPointLogs((pl.data ?? []) as PointLog[])

      const rd = await supabase
        .from('redemptions')
        .select('id,kid_id,redeemed_at,done_at,status,note,rewards(title,cost_points)')
        .eq('kid_id', kidId)
        .order('redeemed_at', { ascending: false })
        .limit(100)
      if (rd.error) throw rd.error
      setRedemptions((rd.data ?? []) as Redemption[])
    } catch (e: unknown) {
      setErr((e instanceof Error ? e.message : String(e)) ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKids()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedKid) loadHistory(selectedKid)
  }, [selectedKid])

  const selectedKidName = kids.find((k) => k.id === selectedKid)?.name ?? ''

  function formatDate(iso: string) {
    return new Intl.DateTimeFormat('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  }

  function reasonLabel(log: PointLog) {
    if (log.tasks?.[0]?.title) return `任務：${log.tasks[0].title}`
    if (log.reason === 'manual') return '手動加扣分'
    return log.reason
  }

  // ── 共用樣式常數 ──────────────────────────────────
  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,.78)',
    borderRadius: 24,
    padding: '20px 24px',
    boxShadow: '0 4px 20px rgba(0,0,0,.08)',
  }
  const btn = (bg: string, color = '#fff', shadow?: string): React.CSSProperties => ({
    border: 'none',
    borderRadius: 999,
    padding: '7px 18px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    background: bg,
    color,
    boxShadow: shadow ?? '0 2px 6px rgba(0,0,0,.12)',
    fontFamily: 'inherit',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  })

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #e0f7fa 0%, #fff9c4 50%, #fce4ec 100%)',
        padding: '24px 20px 48px',
        fontFamily: '"Segoe UI", "Noto Sans TC", sans-serif',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── 標題列 ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(26px, 5vw, 44px)',
              fontWeight: 900,
              color: '#5c2d91',
              textShadow: '2px 3px 0 rgba(92,45,145,.18)',
              letterSpacing: 1,
            }}
          >
            📋 歷史紀錄
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(255,255,255,.7)',
              borderRadius: 999,
              padding: '6px 14px',
              boxShadow: '0 2px 8px rgba(0,0,0,.08)',
            }}
          >
            <Link href="/board" style={btn('linear-gradient(135deg, #339af0, #74c0fc)', '#fff', '0 2px 6px rgba(51,154,240,.4)')}>
              📺 計分板
            </Link>
            <Link href="/admin" style={btn('linear-gradient(135deg, #20c997, #3bc9db)', '#fff', '0 2px 6px rgba(32,201,151,.4)')}>
              ⚙️ 管理
            </Link>
          </div>
        </div>

        {err && (
          <div style={{ background: '#fff0f0', border: '2px solid #ff6b6b', borderRadius: 12, padding: '10px 18px', color: '#c0392b', fontWeight: 700 }}>
            ⚠️ 錯誤：{err}
          </div>
        )}

        {/* ── 選擇小孩 ── */}
        <div style={card}>
          <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 900, color: '#5c2d91' }}>👦 選擇小孩</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {kids.map((k) => (
              <button
                key={k.id}
                onClick={() => setSelectedKid(k.id)}
                style={
                  selectedKid === k.id
                    ? btn('linear-gradient(135deg, #845ef7, #cc5de8)', '#fff', '0 2px 8px rgba(132,94,247,.45)')
                    : btn('rgba(0,0,0,.07)', '#444')
                }
              >
                {k.name}
              </button>
            ))}
          </div>
        </div>

        {selectedKid && (
          <>
            {/* ── 加扣分紀錄 ── */}
            <div style={card}>
              <h2 style={{ margin: '0 0 14px', fontSize: 20, fontWeight: 900, color: '#e67700' }}>
                ⭐ {selectedKidName} 的加扣分紀錄
              </h2>
              {loading ? (
                <div style={{ color: '#888' }}>載入中…</div>
              ) : pointLogs.length === 0 ? (
                <div style={{ color: '#888' }}>目前沒有紀錄。</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: '#f3f0ff', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#5c2d91' }}>時間</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#5c2d91' }}>變化</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#5c2d91' }}>原因</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#5c2d91' }}>備註</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pointLogs.map((log, i) => (
                        <tr
                          key={log.id}
                          style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f1f3f5' }}
                        >
                          <td style={{ padding: '8px 12px', color: '#666', whiteSpace: 'nowrap' }}>{formatDate(log.created_at)}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 800, color: log.delta >= 0 ? '#51cf66' : '#ff6b6b' }}>
                            {log.delta > 0 ? `+${log.delta}` : log.delta}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#333' }}>{reasonLabel(log)}</td>
                          <td style={{ padding: '8px 12px', color: '#888' }}>{log.note ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── 兌換紀錄 ── */}
            <div style={card}>
              <h2 style={{ margin: '0 0 14px', fontSize: 20, fontWeight: 900, color: '#cc5de8' }}>
                🎁 {selectedKidName} 的兌換紀錄
              </h2>
              {loading ? (
                <div style={{ color: '#888' }}>載入中…</div>
              ) : redemptions.length === 0 ? (
                <div style={{ color: '#888' }}>目前沒有兌換紀錄。</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: '#f8f0fc', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#5c2d91' }}>兌換時間</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#5c2d91' }}>願望</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#5c2d91' }}>點數</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#5c2d91' }}>狀態</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#5c2d91' }}>完成時間</th>
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#5c2d91' }}>備註</th>
                      </tr>
                    </thead>
                    <tbody>
                      {redemptions.map((r, i) => (
                        <tr
                          key={r.id}
                          style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f1f3f5' }}
                        >
                          <td style={{ padding: '8px 12px', color: '#666', whiteSpace: 'nowrap' }}>{formatDate(r.redeemed_at)}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: '#333' }}>{r.rewards?.[0]?.title ?? '—'}</td>
                          <td style={{ padding: '8px 12px', color: '#cc5de8', fontWeight: 700 }}>{r.rewards?.[0]?.cost_points ?? '—'}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span
                              style={{
                                borderRadius: 999,
                                padding: '2px 10px',
                                fontSize: 12,
                                fontWeight: 700,
                                background: r.status === 'done' ? 'linear-gradient(135deg, #51cf66, #a9e34b)' : 'linear-gradient(135deg, #ffa94d, #ffd43b)',
                                color: r.status === 'done' ? '#fff' : '#5c4400',
                              }}
                            >
                              {r.status === 'done' ? '✅ 已完成' : '⏳ 待執行'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', color: '#666', whiteSpace: 'nowrap' }}>{r.done_at ? formatDate(r.done_at) : '—'}</td>
                          <td style={{ padding: '8px 12px', color: '#888' }}>{r.note ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
