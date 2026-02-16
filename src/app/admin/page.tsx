'use client'

import AuthGate from '@/components/AuthGate'
import { getSupabase } from '@/lib/supabaseClient'
import { useEffect, useMemo, useState } from 'react'

type Kid = { id: string; name: string; sort_order: number }

type Task = { id: string; title: string; points: number; is_daily: boolean; active: boolean; sort_order: number }

type Reward = { id: string; title: string; cost_points: number; active: boolean; sort_order: number }

type PendingRedemption = {
  id: string
  redeemed_at: string
  kid_id: string
  status: 'pending'
  note: string | null
  kids: { name: string }[] | null
  rewards: { title: string; cost_points: number }[] | null
}

export default function AdminPage() {
  return (
    <AuthGate>
      <Admin />
    </AuthGate>
  )
}

function tzTodayTaipei(): string {
  // YYYY-MM-DD in Asia/Taipei
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(),
  )
  return s
}

function Admin() {
  const [kids, setKids] = useState<Kid[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [pending, setPending] = useState<PendingRedemption[]>([])

  const [selectedKid, setSelectedKid] = useState<string>('')

  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setErr(null)
    setLoading(true)
    try {
      const supabase = getSupabase()

      const k = await supabase.from('kids').select('id,name,sort_order').order('sort_order', { ascending: true })
      if (k.error) throw k.error
      const kk = (k.data ?? []) as Kid[]
      setKids(kk)
      if (!selectedKid && kk[0]?.id) setSelectedKid(kk[0].id)

      const t = await supabase
        .from('tasks')
        .select('id,title,points,is_daily,active,sort_order')
        .eq('active', true)
        .order('sort_order', { ascending: true })
      if (t.error) throw t.error
      setTasks((t.data ?? []) as Task[])

      const r = await supabase
        .from('rewards')
        .select('id,title,cost_points,active,sort_order')
        .eq('active', true)
        .order('sort_order', { ascending: true })
      if (r.error) throw r.error
      setRewards((r.data ?? []) as Reward[])

      const p = await supabase
        .from('redemptions')
        .select('id,status,redeemed_at,kid_id,note,kids(name),rewards(title,cost_points)')
        .eq('status', 'pending')
        .order('redeemed_at', { ascending: false })
        .limit(50)
      if (p.error) throw p.error
      setPending((p.data ?? []) as PendingRedemption[])
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedKidName = useMemo(() => kids.find((k) => k.id === selectedKid)?.name ?? '', [kids, selectedKid])

  async function signOut() {
    setMsg(null)
    const supabase = getSupabase()
    const { error } = await supabase.auth.signOut()
    if (error) setErr(error.message)
  }

  async function addPoints(delta: number, reason: string) {
    setMsg(null)
    setErr(null)
    try {
      if (!selectedKid) throw new Error('請先選擇小孩')
      const supabase = getSupabase()
      const { error } = await supabase.rpc('add_manual_points', { p_kid: selectedKid, p_delta: delta, p_reason: reason })
      if (error) throw error
      setMsg(`${selectedKidName} ${delta > 0 ? '+' : ''}${delta}（${reason}）✅`)
      await load()
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    }
  }

  async function claimTask(taskId: string) {
    setMsg(null)
    setErr(null)
    try {
      if (!selectedKid) throw new Error('請先選擇小孩')
      const supabase = getSupabase()
      const today = tzTodayTaipei()
      const { error } = await supabase.rpc('claim_task', {
        p_kid: selectedKid,
        p_task: taskId,
        p_event_date: today,
        p_reason: 'task',
      })
      if (error) throw error
      setMsg(`${selectedKidName} 任務完成（${today}）✅`)
      await load()
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    }
  }

  async function redeem(rewardId: string) {
    setMsg(null)
    setErr(null)
    try {
      if (!selectedKid) throw new Error('請先選擇小孩')
      const supabase = getSupabase()
      const { error } = await supabase.rpc('redeem_reward', { p_kid: selectedKid, p_reward: rewardId, p_note: null })
      if (error) throw error
      setMsg(`${selectedKidName} 已兌換願望 ✅`)
      await load()
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    }
  }

  async function markDone(redemptionId: string) {
    setMsg(null)
    setErr(null)
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('redemptions')
        .update({ status: 'done', done_at: new Date().toISOString() })
        .eq('id', redemptionId)
      if (error) throw error
      setMsg('已標記完成 ✅')
      await load()
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    }
  }

  return (
    <main style={{ padding: 20, maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>家長管理</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={load} disabled={loading}>
            {loading ? '更新中…' : '重新整理'}
          </button>
          <button onClick={signOut}>Sign out</button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
        <label>
          選擇小孩：
          <select value={selectedKid} onChange={(e) => setSelectedKid(e.target.value)} style={{ marginLeft: 8 }}>
            {kids.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section style={{ marginTop: 16 }}>
        <h2>快速加扣分</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[1, 2, 5].map((n) => (
            <button key={`p${n}`} onClick={() => addPoints(n, 'manual')}>
              +{n}
            </button>
          ))}
          {[1, 2, 5].map((n) => (
            <button key={`m${n}`} onClick={() => addPoints(-n, 'manual')}>
              -{n}
            </button>
          ))}
        </div>
        <p style={{ opacity: 0.7, marginTop: 6 }}>扣分會自動扣到 0 為止（不會變負數）。</p>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2>每日任務（只能領一次 / 天）</h2>
        {tasks.length === 0 ? (
          <div style={{ opacity: 0.7 }}>目前沒有任務。你可以先在 Supabase Table Editor 新增 tasks。</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {tasks.map((t) => (
              <button key={t.id} onClick={() => claimTask(t.id)}>
                {t.title} (+{t.points})
              </button>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 18 }}>
        <h2>願望兌換（兌換就扣點）</h2>
        {rewards.length === 0 ? (
          <div style={{ opacity: 0.7 }}>目前沒有願望。你可以先在 Supabase Table Editor 新增 rewards。</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {rewards.map((r) => (
              <button key={r.id} onClick={() => redeem(r.id)}>
                {r.title}（{r.cost_points} 點）
              </button>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 18 }}>
        <h2>待執行 → 完成</h2>
        {pending.length === 0 ? (
          <div style={{ opacity: 0.7 }}>目前沒有待執行的兌換。</div>
        ) : (
          <ul style={{ paddingLeft: 18 }}>
            {pending.map((p) => (
              <li key={p.id} style={{ marginBottom: 10 }}>
                <div>
                  <b>{p.kids?.[0]?.name ?? p.kid_id}</b>：{p.rewards?.[0]?.title ?? '（未知願望）'}
                  {p.rewards?.[0] ? `（${p.rewards[0].cost_points} 點）` : ''}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button onClick={() => markDone(p.id)}>標記完成</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {msg ? <div style={{ color: 'green', marginTop: 12 }}>{msg}</div> : null}
      {err ? <div style={{ color: 'crimson', marginTop: 12 }}>錯誤：{err}</div> : null}
    </main>
  )
}
