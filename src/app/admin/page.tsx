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

  // Task editor state
  const [taskDraft, setTaskDraft] = useState<{ id?: string; title: string; points: number; is_daily: boolean; active: boolean }>({
    title: '',
    points: 1,
    is_daily: true,
    active: true,
  })

  // Reward editor state
  const [rewardDraft, setRewardDraft] = useState<{ id?: string; title: string; cost_points: number; active: boolean }>({
    title: '',
    cost_points: 10,
    active: true,
  })

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
        .order('sort_order', { ascending: true })
      if (t.error) throw t.error
      setTasks((t.data ?? []) as Task[])

      const r = await supabase
        .from('rewards')
        .select('id,title,cost_points,active,sort_order')
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

  async function saveTask() {
    setMsg(null)
    setErr(null)
    try {
      const supabase = getSupabase()
      const payload = {
        title: taskDraft.title.trim(),
        points: Number(taskDraft.points),
        is_daily: !!taskDraft.is_daily,
        active: !!taskDraft.active,
      }
      if (!payload.title) throw new Error('任務標題不能空白')
      if (!payload.points || payload.points <= 0) throw new Error('點數要是正整數')

      if (taskDraft.id) {
        const { error } = await supabase.from('tasks').update(payload).eq('id', taskDraft.id)
        if (error) throw error
        setMsg('任務已更新 ✅')
      } else {
        const nextSort = (tasks[tasks.length - 1]?.sort_order ?? 0) + 1
        const { error } = await supabase.from('tasks').insert({ ...payload, sort_order: nextSort })
        if (error) throw error
        setMsg('任務已新增 ✅')
      }

      setTaskDraft({ title: '', points: 1, is_daily: true, active: true })
      await load()
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    }
  }

  function editTask(t: Task) {
    setTaskDraft({ id: t.id, title: t.title, points: t.points, is_daily: t.is_daily, active: t.active })
  }

  async function deleteTask(id: string) {
    if (!confirm('確定要刪除這個任務？（若有歷史紀錄，仍可刪，task_id 會變 null）')) return
    setMsg(null)
    setErr(null)
    try {
      const supabase = getSupabase()
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
      setMsg('任務已刪除 ✅')
      await load()
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    }
  }

  async function moveTask(id: string, dir: -1 | 1) {
    setMsg(null)
    setErr(null)
    try {
      const idx = tasks.findIndex((t) => t.id === id)
      const j = idx + dir
      if (idx < 0 || j < 0 || j >= tasks.length) return

      const a = tasks[idx]
      const b = tasks[j]
      const supabase = getSupabase()

      // swap sort_order
      const u1 = await supabase.from('tasks').update({ sort_order: b.sort_order }).eq('id', a.id)
      if (u1.error) throw u1.error
      const u2 = await supabase.from('tasks').update({ sort_order: a.sort_order }).eq('id', b.id)
      if (u2.error) throw u2.error

      await load()
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    }
  }

  async function toggleTaskActive(id: string, active: boolean) {
    setMsg(null)
    setErr(null)
    try {
      const supabase = getSupabase()
      const { error } = await supabase.from('tasks').update({ active }).eq('id', id)
      if (error) throw error
      await load()
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    }
  }

  async function saveReward() {
    setMsg(null)
    setErr(null)
    try {
      const supabase = getSupabase()
      const payload = {
        title: rewardDraft.title.trim(),
        cost_points: Number(rewardDraft.cost_points),
        active: !!rewardDraft.active,
      }
      if (!payload.title) throw new Error('願望標題不能空白')
      if (!payload.cost_points || payload.cost_points <= 0) throw new Error('點數要是正整數')

      if (rewardDraft.id) {
        const { error } = await supabase.from('rewards').update(payload).eq('id', rewardDraft.id)
        if (error) throw error
        setMsg('願望已更新 ✅')
      } else {
        const nextSort = (rewards[rewards.length - 1]?.sort_order ?? 0) + 1
        const { error } = await supabase.from('rewards').insert({ ...payload, sort_order: nextSort })
        if (error) throw error
        setMsg('願望已新增 ✅')
      }

      setRewardDraft({ title: '', cost_points: 10, active: true })
      await load()
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    }
  }

  function editReward(r: Reward) {
    setRewardDraft({ id: r.id, title: r.title, cost_points: r.cost_points, active: r.active })
  }

  async function deleteReward(id: string) {
    if (!confirm('確定要刪除這個願望？（若已被兌換過，可能會因為資料關聯而刪除失敗）')) return
    setMsg(null)
    setErr(null)
    try {
      const supabase = getSupabase()
      const { error } = await supabase.from('rewards').delete().eq('id', id)
      if (error) throw error
      setMsg('願望已刪除 ✅')
      await load()
    } catch (e: any) {
      // Likely FK restrict if used.
      setErr((e?.message ?? String(e)) + '（若已兌換過，請改用停用 active=false）')
    }
  }

  async function moveReward(id: string, dir: -1 | 1) {
    setMsg(null)
    setErr(null)
    try {
      const idx = rewards.findIndex((r) => r.id === id)
      const j = idx + dir
      if (idx < 0 || j < 0 || j >= rewards.length) return

      const a = rewards[idx]
      const b = rewards[j]
      const supabase = getSupabase()

      const u1 = await supabase.from('rewards').update({ sort_order: b.sort_order }).eq('id', a.id)
      if (u1.error) throw u1.error
      const u2 = await supabase.from('rewards').update({ sort_order: a.sort_order }).eq('id', b.id)
      if (u2.error) throw u2.error

      await load()
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    }
  }

  async function toggleRewardActive(id: string, active: boolean) {
    setMsg(null)
    setErr(null)
    try {
      const supabase = getSupabase()
      const { error } = await supabase.from('rewards').update({ active }).eq('id', id)
      if (error) throw error
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
        <h2>每日任務（孩子領點用）</h2>
        {tasks.filter((t) => t.active).length === 0 ? (
          <div style={{ opacity: 0.7 }}>目前沒有啟用中的任務。</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {tasks
              .filter((t) => t.active)
              .map((t) => (
                <button key={t.id} onClick={() => claimTask(t.id)}>
                  {t.title} (+{t.points})
                </button>
              ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 18, paddingTop: 12, borderTop: '1px solid rgba(127,127,127,.2)' }}>
        <h2>任務管理（新增 / 編輯 / 排序 / 刪除）</h2>

        <div style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
          <label>
            標題
            <input
              value={taskDraft.title}
              onChange={(e) => setTaskDraft((d) => ({ ...d, title: e.target.value }))}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            點數
            <input
              type="number"
              value={taskDraft.points}
              onChange={(e) => setTaskDraft((d) => ({ ...d, points: Number(e.target.value) }))}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={taskDraft.is_daily}
              onChange={(e) => setTaskDraft((d) => ({ ...d, is_daily: e.target.checked }))}
            />{' '}
            每日任務（同一天只能領一次）
          </label>
          <label>
            <input
              type="checkbox"
              checked={taskDraft.active}
              onChange={(e) => setTaskDraft((d) => ({ ...d, active: e.target.checked }))}
            />{' '}
            啟用
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={saveTask}>{taskDraft.id ? '更新任務' : '新增任務'}</button>
            {taskDraft.id ? (
              <button onClick={() => setTaskDraft({ title: '', points: 1, is_daily: true, active: true })}>取消編輯</button>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          {tasks.map((t, idx) => (
            <div
              key={t.id}
              style={{
                border: '1px solid rgba(127,127,127,.25)',
                borderRadius: 12,
                padding: 10,
                opacity: t.active ? 1 : 0.6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <b>{t.title}</b> <span style={{ opacity: 0.7 }}>(+{t.points})</span> {t.is_daily ? <span style={{ opacity: 0.7 }}>[每日]</span> : null}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => moveTask(t.id, -1)} disabled={idx === 0}>
                    ↑
                  </button>
                  <button onClick={() => moveTask(t.id, 1)} disabled={idx === tasks.length - 1}>
                    ↓
                  </button>
                  <button onClick={() => editTask(t)}>編輯</button>
                  <button onClick={() => toggleTaskActive(t.id, !t.active)}>{t.active ? '停用' : '啟用'}</button>
                  <button onClick={() => deleteTask(t.id)} style={{ color: 'crimson' }}>
                    刪除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2>願望兌換（孩子兌換用）</h2>
        {rewards.filter((r) => r.active).length === 0 ? (
          <div style={{ opacity: 0.7 }}>目前沒有啟用中的願望。</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {rewards
              .filter((r) => r.active)
              .map((r) => (
                <button key={r.id} onClick={() => redeem(r.id)}>
                  {r.title}（{r.cost_points} 點）
                </button>
              ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 18, paddingTop: 12, borderTop: '1px solid rgba(127,127,127,.2)' }}>
        <h2>願望管理（新增 / 編輯 / 排序 / 刪除）</h2>

        <div style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
          <label>
            標題
            <input
              value={rewardDraft.title}
              onChange={(e) => setRewardDraft((d) => ({ ...d, title: e.target.value }))}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            需要點數
            <input
              type="number"
              value={rewardDraft.cost_points}
              onChange={(e) => setRewardDraft((d) => ({ ...d, cost_points: Number(e.target.value) }))}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={rewardDraft.active}
              onChange={(e) => setRewardDraft((d) => ({ ...d, active: e.target.checked }))}
            />{' '}
            啟用
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={saveReward}>{rewardDraft.id ? '更新願望' : '新增願望'}</button>
            {rewardDraft.id ? (
              <button onClick={() => setRewardDraft({ title: '', cost_points: 10, active: true })}>取消編輯</button>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          {rewards.map((r, idx) => (
            <div
              key={r.id}
              style={{ border: '1px solid rgba(127,127,127,.25)', borderRadius: 12, padding: 10, opacity: r.active ? 1 : 0.6 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <b>{r.title}</b> <span style={{ opacity: 0.7 }}>（{r.cost_points} 點）</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => moveReward(r.id, -1)} disabled={idx === 0}>
                    ↑
                  </button>
                  <button onClick={() => moveReward(r.id, 1)} disabled={idx === rewards.length - 1}>
                    ↓
                  </button>
                  <button onClick={() => editReward(r)}>編輯</button>
                  <button onClick={() => toggleRewardActive(r.id, !r.active)}>{r.active ? '停用' : '啟用'}</button>
                  <button onClick={() => deleteReward(r.id)} style={{ color: 'crimson' }}>
                    刪除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
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
