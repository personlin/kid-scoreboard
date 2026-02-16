import AuthGate from '@/components/AuthGate'

export default function BoardPage() {
  return (
    <AuthGate>
      <Board />
    </AuthGate>
  )
}

async function fetchBalances() {
  // Note: Supabase client in this file is a placeholder; for server components we'd typically use
  // @supabase/ssr. For MVP, we keep it simple and fetch on the client later.
  return [] as Array<{ kid_id: string; name: string; balance: number }>
}

function Board() {
  return (
    <main style={{ padding: 20, maxWidth: 980, margin: '0 auto' }}>
      <h1>家庭計分板</h1>
      <p style={{ opacity: 0.75 }}>（需要登入）</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <KidCard name="娜娜" points={0} />
        <KidCard name="楷楷" points={0} />
      </div>

      <p style={{ marginTop: 18, opacity: 0.7 }}>
        下一步：接上 Supabase 讀取 <code>kid_balances</code> + pending redemptions。
      </p>
    </main>
  )
}

function KidCard({ name, points }: { name: string; points: number }) {
  return (
    <div style={{ border: '1px solid rgba(127,127,127,.25)', borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{name}</div>
      <div style={{ fontSize: 48, fontWeight: 900, marginTop: 6 }}>{points}</div>
      <div style={{ opacity: 0.7 }}>點</div>
    </div>
  )
}
