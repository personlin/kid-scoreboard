-- 全域設定表（key-value）
create table if not exists public.settings (
  key   text primary key,
  value text
);

-- 啟用 RLS
alter table public.settings enable row level security;

-- 所有人（含 anon）可讀取（board PIN 驗證需要）
create policy "Public read settings"
  on public.settings for select
  using (true);

-- 僅已驗證使用者可寫入（管理員設定 PIN）
create policy "Authenticated upsert settings"
  on public.settings for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
