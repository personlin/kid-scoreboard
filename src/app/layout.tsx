import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kids Scoreboard',
  description: 'Family points + rewards scoreboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Noto Sans TC, Arial' }}>
        {children}
      </body>
    </html>
  )
}
