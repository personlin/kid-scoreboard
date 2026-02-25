import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const hasSupabaseEnv = !!(supabaseUrl && supabaseAnonKey)

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!hasSupabaseEnv) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  if (!client) {
    client = createClient(supabaseUrl!, supabaseAnonKey!)
  }
  return client
}

/**
 * 統一將 Error / PostgrestError / 任意值 轉為可讀字串。
 * Supabase 的 PostgrestError 不繼承 Error，
 * 直接 String() 會輸出 "[object Object]"，需額外取 .message。
 */
export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as Record<string, unknown>).message)
  }
  return String(e)
}
