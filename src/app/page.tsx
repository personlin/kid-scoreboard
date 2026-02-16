import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: 20, maxWidth: 820, margin: '0 auto' }}>
      <h1>Kids Scoreboard</h1>
      <p style={{ opacity: 0.75 }}>
        MVP: 家長登入後可查看看板（/board）與管理（/admin）。
      </p>
      <ul>
        <li>
          <Link href="/board">看板 /board</Link>
        </li>
        <li>
          <Link href="/admin">管理 /admin</Link>
        </li>
      </ul>
    </main>
  )
}
