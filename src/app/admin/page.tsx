'use client'

import AuthGate from '@/components/AuthGate'
import { errMsg, getSupabase } from '@/lib/supabaseClient'
import Link from 'next/link'
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
  kids: { name: string } | null
  rewards: { title: string; cost_points: number } | null
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

  // Board PIN
  const [boardPin, setBoardPin] = useState('')
  const [pinMsg, setPinMsg] = useState<string | null>(null)
  useEffect(() => {
    async function loadPin() {
      const supabase = getSupabase()
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'board_pin')
        .maybeSingle()
      setBoardPin(data?.value ?? '')
    }
    loadPin()
  }, [])

  // Task editor state
  const [taskDraft, setTaskDraft] = useState<{ id?: string; title: string; points: number; is_daily: boolean; active: boolean }>({
    title: '',
    points: 1,
    is_daily: true,
    active: true,
  })

  // General manual scoring state
  const [manualDelta, setManualDelta] = useState<number>(1)
  const [manualReason, setManualReason] = useState<string>('')

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
      setPending((p.data ?? []) as unknown as PendingRedemption[])
    } catch (e: unknown) {
      setErr(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedKidName = useMemo(() => kids.find((k) => k.id === selectedKid)?.name ?? '', [kids, selectedKid])

  async function saveBoardPin() {
    const trimmed = boardPin.trim()
    if (trimmed && !/^\d+$/.test(trimmed)) {
      setPinMsg('請輸入純數字密碼')
      return
    }
    const supabase = getSupabase()
    if (trimmed) {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'board_pin', value: trimmed })
      if (error) { setPinMsg(`儲存失敗：${error.message}`); return }
      setPinMsg(`密碼已設定為 ${trimmed} ✅`)
    } else {
      const { error } = await supabase
        .from('settings')
        .delete()
        .eq('key', 'board_pin')
      if (error) { setPinMsg(`清除失敗：${error.message}`); return }
      setPinMsg('已清除密碼，計分看板將直接開放 ✅')
    }
    // 清除本機 session
    sessionStorage.removeItem('kidboard_unlocked')
    setTimeout(() => setPinMsg(null), 3000)
  }

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
    } catch (e: unknown) {
      setErr(errMsg(e))
    }
  }

  async function claimTask(taskId: string, taskTitle: string) {
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
        p_reason: taskTitle,
      })
      if (error) {
        // 偵測每日任務重複領取（unique 違反或 RPC 自訂訊息）
        const msg = error.message ?? ''
        const code = (error as { code?: string }).code ?? ''
        if (
          code === '23505' ||
          msg.toLowerCase().includes('already') ||
          msg.toLowerCase().includes('duplicate') ||
          msg.toLowerCase().includes('unique')
        ) {
          setMsg(`⚠️ ${selectedKidName} 今天已經領過「${taskTitle}」了，不能重複領取。`)
          return
        }
        throw error
      }
      setMsg(`${selectedKidName} 完成「${taskTitle}」✅`)
      await load()
    } catch (e: unknown) {
      setErr(errMsg(e))
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
    } catch (e: unknown) {
      setErr(errMsg(e))
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
    } catch (e: unknown) {
      setErr(errMsg(e))
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
    } catch (e: unknown) {
      setErr(errMsg(e))
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
    } catch (e: unknown) {
      setErr(errMsg(e))
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
    } catch (e: unknown) {
      setErr(errMsg(e))
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
    } catch (e: unknown) {
      setErr(errMsg(e))
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
    } catch (e: unknown) {
      setErr(errMsg(e))
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
    } catch (e: unknown) {
      // Likely FK restrict if used.
      setErr(errMsg(e) + '（若已兌換過，請改用停用 active=false）')
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
    } catch (e: unknown) {
      setErr(errMsg(e))
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
    } catch (e: unknown) {
      setErr(errMsg(e))
    }
  }

  // ── 共用樣式常數 ──────────────────────────────────
  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,.78)',
    borderRadius: 24,
    padding: '20px 24px',
    boxShadow: '0 4px 20px rgba(0,0,0,.08)',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '2px solid #dee2e6',
    borderRadius: 10,
    padding: '8px 12px',
    fontSize: 15,
    fontFamily: 'inherit',
    marginTop: 4,
    outline: 'none',
    boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    fontWeight: 600,
    fontSize: 14,
    color: '#495057',
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
  })
  const rowCard = (active = true): React.CSSProperties => ({
    border: '2px solid #e9ecef',
    borderRadius: 14,
    padding: '10px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap' as const,
    background: '#fff',
    opacity: active ? 1 : 0.55,
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
            ⚙️ 家長管理
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
            <span style={{ opacity: 0.75, fontSize: 14, fontWeight: 700, color: '#5c2d91' }}>{loading ? '⏳ 更新中…' : '✅ 已更新'}</span>
            <button
              onClick={load}
              disabled={loading}
              style={btn('linear-gradient(135deg, #845ef7, #cc5de8)', '#fff', '0 2px 6px rgba(132,94,247,.4)')}
            >
              🔄 重新整理
            </button>
            <Link
              href="/history"
              style={{
                ...btn('linear-gradient(135deg, #ffa94d, #ffd43b)', '#5c4400', '0 2px 6px rgba(255,169,77,.4)'),
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              📋 紀錄
            </Link>
            <Link
              href="/board"
              style={{
                ...btn('linear-gradient(135deg, #339af0, #74c0fc)', '#fff', '0 2px 6px rgba(51,154,240,.4)'),
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              📺 計分板
            </Link>
            <button onClick={signOut} style={btn('rgba(0,0,0,.08)', '#444')}>
              登出
            </button>
          </div>
        </div>

        {/* ── 訊息橫幅 ── */}
        {msg && (
          <div style={{ background: '#d3f9d8', border: '2px solid #51cf66', borderRadius: 12, padding: '10px 18px', color: '#1c7c3a', fontWeight: 700 }}>
            {msg}
          </div>
        )}
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

        {/* ── 快速加扣分 ── */}
        <div style={card}>
          <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 900, color: '#e67700' }}>⚡ 快速加扣分</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[1, 2, 5].map((n) => (
              <button
                key={`p${n}`}
                onClick={() => addPoints(n, 'manual')}
                style={btn('linear-gradient(135deg, #51cf66, #a9e34b)', '#fff', '0 2px 6px rgba(81,207,102,.4)')}
              >
                +{n} ⭐
              </button>
            ))}
            {[1, 2, 5].map((n) => (
              <button
                key={`m${n}`}
                onClick={() => addPoints(-n, 'manual')}
                style={btn('linear-gradient(135deg, #ff6b6b, #f03e3e)', '#fff', '0 2px 6px rgba(255,107,107,.4)')}
              >
                -{n}
              </button>
            ))}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 13, color: '#888' }}>扣分會自動扣到 0 為止（不會變負數）。</p>
        </div>

        {/* ── 一般加扣分 ── */}
        <div style={card}>
          <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 900, color: '#0ca678' }}>📝 一般加扣分</h2>
          <div style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
            <label style={labelStyle}>
              分數（正數為加分，負數為扣分）
              <input
                type="number"
                value={manualDelta}
                onChange={(e) => setManualDelta(Number(e.target.value))}
                style={{ ...inputStyle, width: 140 }}
              />
            </label>
            <label style={labelStyle}>
              理由
              <input
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                style={inputStyle}
                placeholder="請輸入理由…"
              />
            </label>
            <div>
              <button
                onClick={async () => {
                  if (!manualReason.trim()) { setErr('請輸入理由'); return }
                  if (!manualDelta || isNaN(manualDelta)) { setErr('分數不能為 0'); return }
                  await addPoints(manualDelta, manualReason.trim())
                  setManualReason('')
                  setManualDelta(1)
                }}
                style={btn(
                  manualDelta >= 0
                    ? 'linear-gradient(135deg, #51cf66, #a9e34b)'
                    : 'linear-gradient(135deg, #ff6b6b, #f03e3e)',
                  '#fff',
                  manualDelta >= 0 ? '0 2px 6px rgba(81,207,102,.4)' : '0 2px 6px rgba(255,107,107,.4)',
                )}
              >
                {manualDelta >= 0 ? `+${manualDelta} 加分` : `${manualDelta} 扣分`}
              </button>
            </div>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 13, color: '#888' }}>扣分會自動扣到 0 為止（不會變負數）。</p>
        </div>

        {/* ── 每日任務（領點） ── */}
        <div style={card}>
          <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 900, color: '#e67700' }}>✅ 每日任務（孩子領點用）</h2>
          {tasks.filter((t) => t.active).length === 0 ? (
            <div style={{ color: '#888' }}>目前沒有啟用中的任務。</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tasks
                .filter((t) => t.active)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => claimTask(t.id, t.title)}
                    style={btn('linear-gradient(135deg, #ffa94d, #ffd43b)', '#5c4400', '0 2px 6px rgba(255,169,77,.4)')}
                  >
                    {t.title} <span style={{ opacity: 0.75 }}>(+{t.points})</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* ── 任務管理 ── */}
        <div style={card}>
          <h2 style={{ margin: '0 0 14px', fontSize: 20, fontWeight: 900, color: '#5c2d91' }}>📋 任務管理</h2>

          {/* 表單 */}
          <div style={{ display: 'grid', gap: 10, maxWidth: 520, marginBottom: 18 }}>
            <label style={labelStyle}>
              標題
              <input
                value={taskDraft.title}
                onChange={(e) => setTaskDraft((d) => ({ ...d, title: e.target.value }))}
                style={inputStyle}
                placeholder="任務名稱…"
              />
            </label>
            <label style={labelStyle}>
              點數
              <input
                type="number"
                value={taskDraft.points}
                onChange={(e) => setTaskDraft((d) => ({ ...d, points: Number(e.target.value) }))}
                style={{ ...inputStyle, width: 120 }}
              />
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 14, color: '#495057' }}>
              <input
                type="checkbox"
                checked={taskDraft.is_daily}
                onChange={(e) => setTaskDraft((d) => ({ ...d, is_daily: e.target.checked }))}
              />
              每日任務（同一天只能領一次）
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 14, color: '#495057' }}>
              <input
                type="checkbox"
                checked={taskDraft.active}
                onChange={(e) => setTaskDraft((d) => ({ ...d, active: e.target.checked }))}
              />
              啟用
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={saveTask}
                style={btn('linear-gradient(135deg, #845ef7, #cc5de8)', '#fff', '0 2px 6px rgba(132,94,247,.4)')}
              >
                {taskDraft.id ? '💾 更新任務' : '➕ 新增任務'}
              </button>
              {taskDraft.id && (
                <button
                  onClick={() => setTaskDraft({ title: '', points: 1, is_daily: true, active: true })}
                  style={btn('rgba(0,0,0,.08)', '#444')}
                >
                  取消編輯
                </button>
              )}
            </div>
          </div>

          {/* 任務列表 */}
          <div style={{ display: 'grid', gap: 8 }}>
            {tasks.map((t, idx) => (
              <div key={t.id} style={rowCard(t.active)}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#333' }}>
                  {t.title}
                  <span style={{ marginLeft: 6, fontWeight: 500, color: '#51cf66' }}>+{t.points}</span>
                  {t.is_daily && <span style={{ marginLeft: 6, fontSize: 12, color: '#845ef7', background: '#f3f0ff', borderRadius: 6, padding: '2px 7px' }}>每日</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => moveTask(t.id, -1)} disabled={idx === 0} style={btn('rgba(0,0,0,.07)', '#444')}>↑</button>
                  <button onClick={() => moveTask(t.id, 1)} disabled={idx === tasks.length - 1} style={btn('rgba(0,0,0,.07)', '#444')}>↓</button>
                  <button onClick={() => editTask(t)} style={btn('linear-gradient(135deg, #339af0, #74c0fc)', '#fff')}>編輯</button>
                  <button onClick={() => toggleTaskActive(t.id, !t.active)} style={btn('linear-gradient(135deg, #ffa94d, #ffd43b)', '#5c4400')}>
                    {t.active ? '停用' : '啟用'}
                  </button>
                  <button onClick={() => deleteTask(t.id)} style={btn('linear-gradient(135deg, #ff6b6b, #f03e3e)', '#fff')}>刪除</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 願望兌換 ── */}
        <div style={card}>
          <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 900, color: '#e67700' }}>🎁 願望兌換（孩子兌換用）</h2>
          {rewards.filter((r) => r.active).length === 0 ? (
            <div style={{ color: '#888' }}>目前沒有啟用中的願望。</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {rewards
                .filter((r) => r.active)
                .map((r) => (
                  <button
                    key={r.id}
                    onClick={() => redeem(r.id)}
                    style={btn('linear-gradient(135deg, #cc5de8, #f783ac)', '#fff', '0 2px 6px rgba(204,93,232,.4)')}
                  >
                    {r.title} <span style={{ opacity: 0.8 }}>（{r.cost_points} 點）</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* ── 願望管理 ── */}
        <div style={card}>
          <h2 style={{ margin: '0 0 14px', fontSize: 20, fontWeight: 900, color: '#5c2d91' }}>🌈 願望管理</h2>

          {/* 表單 */}
          <div style={{ display: 'grid', gap: 10, maxWidth: 520, marginBottom: 18 }}>
            <label style={labelStyle}>
              標題
              <input
                value={rewardDraft.title}
                onChange={(e) => setRewardDraft((d) => ({ ...d, title: e.target.value }))}
                style={inputStyle}
                placeholder="願望名稱…"
              />
            </label>
            <label style={labelStyle}>
              需要點數
              <input
                type="number"
                value={rewardDraft.cost_points}
                onChange={(e) => setRewardDraft((d) => ({ ...d, cost_points: Number(e.target.value) }))}
                style={{ ...inputStyle, width: 120 }}
              />
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 14, color: '#495057' }}>
              <input
                type="checkbox"
                checked={rewardDraft.active}
                onChange={(e) => setRewardDraft((d) => ({ ...d, active: e.target.checked }))}
              />
              啟用
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={saveReward}
                style={btn('linear-gradient(135deg, #845ef7, #cc5de8)', '#fff', '0 2px 6px rgba(132,94,247,.4)')}
              >
                {rewardDraft.id ? '💾 更新願望' : '➕ 新增願望'}
              </button>
              {rewardDraft.id && (
                <button
                  onClick={() => setRewardDraft({ title: '', cost_points: 10, active: true })}
                  style={btn('rgba(0,0,0,.08)', '#444')}
                >
                  取消編輯
                </button>
              )}
            </div>
          </div>

          {/* 願望列表 */}
          <div style={{ display: 'grid', gap: 8 }}>
            {rewards.map((r, idx) => (
              <div key={r.id} style={rowCard(r.active)}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#333' }}>
                  {r.title}
                  <span style={{ marginLeft: 6, fontWeight: 500, color: '#cc5de8' }}>{r.cost_points} 點</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => moveReward(r.id, -1)} disabled={idx === 0} style={btn('rgba(0,0,0,.07)', '#444')}>↑</button>
                  <button onClick={() => moveReward(r.id, 1)} disabled={idx === rewards.length - 1} style={btn('rgba(0,0,0,.07)', '#444')}>↓</button>
                  <button onClick={() => editReward(r)} style={btn('linear-gradient(135deg, #339af0, #74c0fc)', '#fff')}>編輯</button>
                  <button onClick={() => toggleRewardActive(r.id, !r.active)} style={btn('linear-gradient(135deg, #ffa94d, #ffd43b)', '#5c4400')}>
                    {r.active ? '停用' : '啟用'}
                  </button>
                  <button onClick={() => deleteReward(r.id)} style={btn('linear-gradient(135deg, #ff6b6b, #f03e3e)', '#fff')}>刪除</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 待執行願望 ── */}
        <div style={card}>
          <h2 style={{ margin: '0 0 14px', fontSize: 20, fontWeight: 900, color: '#e67700' }}>🌟 待執行願望 → 完成</h2>
          {pending.length === 0 ? (
            <div style={{ color: '#888', fontSize: 16 }}>🎉 目前沒有待執行的兌換！</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pending.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: 'linear-gradient(90deg, #fff9db, #fff3bf)',
                    border: '2px solid #ffd43b',
                    borderRadius: 14,
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontWeight: 600, color: '#5c4400' }}>
                    <span style={{ background: '#ffd43b', borderRadius: 999, padding: '2px 12px', fontWeight: 800 }}>
                      {p.kids?.name ?? p.kid_id}
                    </span>
                    <span>🎁 {p.rewards?.title ?? '（未知願望）'}</span>
                    {p.rewards && <span style={{ opacity: 0.7, fontSize: 14 }}>（{p.rewards.cost_points} 點）</span>}
                  </div>
                  <button
                    onClick={() => markDone(p.id)}
                    style={btn('linear-gradient(135deg, #51cf66, #a9e34b)', '#fff', '0 2px 6px rgba(81,207,102,.4)')}
                  >
                    ✅ 標記完成
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 計分看板密碼設定 ── */}
        <div style={card}>
          <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 900, color: '#5c2d91' }}>🔒 計分看板密碼</h2>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: '#888', lineHeight: 1.6 }}>
            小孩瀏覽 /board 時需輸入此數字密碼。<br />
            留空則不需密碼，任何人就能直接查看。
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={boardPin}
              onChange={(e) => setBoardPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="例：1234"
              style={{
                border: '2px solid #dee2e6',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 6,
                width: 160,
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
            <button
              onClick={saveBoardPin}
              style={btn('linear-gradient(135deg, #845ef7, #cc5de8)', '#fff', '0 2px 6px rgba(132,94,247,.4)')}
            >
              💾 儲存密碼
            </button>
            {boardPin && (
              <button
                onClick={async () => {
                  const supabase = getSupabase()
                  await supabase.from('settings').delete().eq('key', 'board_pin')
                  setBoardPin('')
                  sessionStorage.removeItem('kidboard_unlocked')
                  setPinMsg('已清除密碼，計分看板將直接開放 ✅')
                  setTimeout(() => setPinMsg(null), 3000)
                }}
                style={btn('rgba(0,0,0,.08)', '#444')}
              >
                清除密碼
              </button>
            )}
          </div>
          {pinMsg && (
            <div style={{ marginTop: 10, background: '#d3f9d8', border: '2px solid #51cf66', borderRadius: 10, padding: '8px 14px', color: '#1c7c3a', fontWeight: 700, fontSize: 13 }}>
              {pinMsg}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
