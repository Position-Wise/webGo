-- Broadcast expiration support
-- Run this in Supabase SQL Editor.

alter table public.admin_broadcasts
add column if not exists duration text default 'forever';

alter table public.admin_broadcasts
add column if not exists expires_at timestamptz;

alter table public.admin_broadcasts
add column if not exists created_by uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_broadcasts_created_by_fkey'
  ) then
    alter table public.admin_broadcasts
      add constraint admin_broadcasts_created_by_fkey
      foreign key (created_by) references public.profiles(id) on delete set null;
  end if;
end $$;

-- Optional one-time cleanup
delete from public.admin_broadcasts
where expires_at is not null
  and expires_at < now();

-- Optional hourly cleanup job (requires pg_cron enabled)
-- create extension if not exists pg_cron;
-- select cron.schedule(
--   'delete_expired_broadcasts',
--   '0 * * * *',
--   $$ delete from public.admin_broadcasts where expires_at is not null and expires_at < now(); $$
-- );
