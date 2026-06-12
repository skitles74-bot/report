-- Issue Report: subscriptions table
-- Supabase SQL Editor에서 실행하세요.

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  keyword text not null,
  schedule text not null check (schedule in ('daily', 'weekly')),
  active boolean default true,
  last_sent_at timestamptz,
  created_at timestamptz default now(),
  unique (email, keyword)
);

create index if not exists idx_subscriptions_active on subscriptions (active) where active = true;
