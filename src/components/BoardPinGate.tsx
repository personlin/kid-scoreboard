'use client'

import { useEffect, useRef, useState } from 'react'
import { getSupabase } from '@/lib/supabaseClient'

const SESSION_KEY = 'kidboard_unlocked'   // sessionStorage：本次已解鎖

export default function BoardPinGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'locked' | 'unlocked'>('loading')
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)
  const pinRef = useRef<string>('')  // 從 Supabase 讀取的 PIN

  useEffect(() => {
    async function init() {
      const supabase = getSupabase()

      // 若已有 Supabase 登入 session（管理員），直接解鎖，不需要輸入 PIN
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setStatus('unlocked')
        return
      }

      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'board_pin')
        .maybeSingle()

      const pin = data?.value ?? ''
      pinRef.current = pin

      // 若未設定密碼，直接開放
      if (!pin) {
        setStatus('unlocked')
        return
      }
      const unlocked = sessionStorage.getItem(SESSION_KEY)
      setStatus(unlocked === '1' ? 'unlocked' : 'locked')
    }
    init()
  }, [])

  function handlePress(digit: string) {
    if (input.length >= 8) return
    const next = input + digit
    setInput(next)

    const pin = pinRef.current
    if (next.length >= pin.length) {
      if (next === pin) {
        sessionStorage.setItem(SESSION_KEY, '1')
        setStatus('unlocked')
      } else {
        setShake(true)
        setTimeout(() => {
          setShake(false)
          setInput('')
        }, 600)
      }
    }
  }

  function handleClear() {
    setInput('')
  }

  if (status === 'loading') {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 32 }}>⏳</div>
          <div style={{ color: '#888', fontWeight: 600, marginTop: 8 }}>載入中…</div>
        </div>
      </main>
    )
  }

  if (status === 'unlocked') return <>{children}</>

  const dots = Array.from({ length: Math.max(4, pinRef.current.length) })

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        {/* 標題 */}
        <div style={{ fontSize: 52, marginBottom: 4 }}>🏆</div>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: '#5c2d91' }}>
          家庭計分板
        </h1>
        <p style={{ margin: '0 0 24px', color: '#888', fontSize: 14 }}>輸入密碼查看得分</p>

        {/* 密碼點點顯示 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 28,
            animation: shake ? 'shake .5s ease' : 'none',
          }}
        >
          {dots.map((_, i) => (
            <div
              key={i}
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: '3px solid #845ef7',
                background: i < input.length ? '#845ef7' : 'transparent',
                transition: 'background .15s',
              }}
            />
          ))}
        </div>

        {/* 數字鍵盤 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 260, margin: '0 auto' }}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k) => (
            <button
              key={k}
              onClick={() => k === '⌫' ? handleClear() : k ? handlePress(k) : undefined}
              disabled={!k}
              style={{
                height: 60,
                borderRadius: 16,
                border: 'none',
                fontSize: k === '⌫' ? 22 : 26,
                fontWeight: 800,
                fontFamily: 'inherit',
                cursor: k ? 'pointer' : 'default',
                background: k === '⌫'
                  ? 'linear-gradient(135deg, #ff6b6b, #f03e3e)'
                  : k
                  ? 'linear-gradient(135deg, #845ef7, #cc5de8)'
                  : 'transparent',
                color: k ? '#fff' : 'transparent',
                boxShadow: k ? '0 3px 8px rgba(132,94,247,.3)' : 'none',
                transition: 'transform .1s, box-shadow .1s',
              }}
              onMouseDown={(e) => { if (k) (e.currentTarget.style.transform = 'scale(.93)') }}
              onMouseUp={(e) => { (e.currentTarget.style.transform = 'scale(1)') }}
            >
              {k}
            </button>
          ))}
        </div>

        {shake && (
          <p style={{ marginTop: 18, color: '#ff6b6b', fontWeight: 700, fontSize: 14 }}>
            ❌ 密碼錯誤，請再試一次
          </p>
        )}
      </div>

      {/* shake 動畫 */}
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-10px)}
          40%{transform:translateX(10px)}
          60%{transform:translateX(-8px)}
          80%{transform:translateX(8px)}
        }
      `}</style>
    </main>
  )
}

// ── 樣式常數 ──────────────────────────────────────
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
  padding: '36px 32px 40px',
  boxShadow: '0 8px 32px rgba(0,0,0,.10)',
  width: '100%',
  maxWidth: 340,
  textAlign: 'center',
}
