-- Plan-level broadcast permissions and trade usage tracking.
-- Run this in Supabase SQL Editor.

alter table public.subscription_plans
add column if not exists allow_trade boolean default false;

alter table public.subscription_plans
add column if not exists allow_investment boolean default true;

alter table public.subscription_plans
add column if not exists trade_limit_per_week integer;

update public.subscription_plans
set allow_trade = false,
    allow_investment = true,
    trade_limit_per_week = 0
where lower(name) = 'basic';

update public.subscription_plans
set allow_trade = true,
    allow_investment = true,
    trade_limit_per_week = 2
where lower(name) = 'growth';

update public.subscription_plans
set allow_trade = true,
    allow_investment = true,
    trade_limit_per_week = null
where lower(name) = 'elite';

create table if not exists public.trade_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  broadcast_id uuid references public.admin_broadcasts(id) on delete cascade,
  created_at timestamptz default now()
);

create index if not exists trade_usage_user_created_at_idx
  on public.trade_usage (user_id, created_at desc);
