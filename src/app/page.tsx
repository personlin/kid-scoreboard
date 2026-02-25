import Link from 'next/link'

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #e0f7fa 0%, #fff9c4 50%, #fce4ec 100%)',
        padding: '24px 20px 40px',
        fontFamily: '"Segoe UI", "Noto Sans TC", sans-serif',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(32px, 6vw, 52px)',
            fontWeight: 900,
            color: '#5c2d91',
            textShadow: '2px 3px 0 rgba(92,45,145,.18)',
            letterSpacing: 1,
          }}
        >
          🏆 Kids Scoreboard
        </h1>

        <p
          style={{
            marginTop: 12,
            marginBottom: 0,
            fontSize: 18,
            fontWeight: 600,
            color: '#5c2d91',
            opacity: 0.9,
          }}
        >
          MVP：家長登入後可查看看板與管理頁面。
        </p>

        <section
          style={{
            marginTop: 24,
            background: 'rgba(255,255,255,.75)',
            borderRadius: 24,
            padding: '20px 24px',
            boxShadow: '0 4px 20px rgba(0,0,0,.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 900, color: '#e67700' }}>🌟 快速入口</div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link
              href="/board"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #845ef7, #cc5de8)',
                color: '#fff',
                borderRadius: 999,
                padding: '10px 18px',
                fontWeight: 800,
                fontSize: 16,
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(132,94,247,.35)',
              }}
            >
              📺 看板 /board
            </Link>

            <Link
              href="/admin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #20c997, #3bc9db)',
                color: '#fff',
                borderRadius: 999,
                padding: '10px 18px',
                fontWeight: 800,
                fontSize: 16,
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(32,201,151,.35)',
              }}
            >
              ⚙️ 管理 /admin
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
