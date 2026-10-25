-- QR-Ybanez: Digital School Event Passport
-- Apply once to the existing Supabase database AFTER the secure attendance migrations.
-- Safe to rerun: additive DDL, idempotent policies/triggers, and conflict-safe seed data.
-- No existing attendance or event data is modified.

create table if not exists public.stamp_collections (
  id uuid primary key default gen_random_uuid(),
  collection_key text not null unique,
  category text not null check (category in ('christmas_party','ccs_week','foundation_day','intramurals')),
  edition_year integer not null check (edition_year between 2026 and 2100),
  display_name text not null,
  theme_key text not null check (theme_key in ('holiday','digital','heritage','victory')),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique(category,edition_year)
);

alter table public.events
  add column if not exists stamp_collection_id uuid
  references public.stamp_collections(id) on delete set null;

create index if not exists events_stamp_collection_id_idx
  on public.events(stamp_collection_id);

alter table public.stamp_collections enable row level security;
drop policy if exists "Passport collections visible to students" on public.stamp_collections;
create policy "Passport collections visible to students"
  on public.stamp_collections for select to authenticated
  using (is_published or public.is_admin());

drop policy if exists "Only admins insert passport collections" on public.stamp_collections;
create policy "Only admins insert passport collections"
  on public.stamp_collections for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Only admins update passport collections" on public.stamp_collections;
create policy "Only admins update passport collections"
  on public.stamp_collections for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Only admins delete passport collections" on public.stamp_collections;
create policy "Only admins delete passport collections"
  on public.stamp_collections for delete to authenticated
  using (public.is_admin());

grant select, insert, update, delete on public.stamp_collections to authenticated;

-- Existing teacher event permissions stay unchanged. This additional guard
-- prevents teachers from assigning arbitrary events to commemorative collections,
-- even if they call Supabase REST directly rather than using the app form.
create or replace function public.protect_event_stamp_collection()
returns trigger language plpgsql security definer
set search_path = public
as $passport_guard$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' and new.stamp_collection_id is not null then
      raise exception 'Only admins can assign signature stamp collections.';
    elsif tg_op = 'UPDATE' and
      new.stamp_collection_id is distinct from old.stamp_collection_id then
      raise exception 'Only admins can change signature stamp collections.';
    end if;
  end if;
  return new;
end;
$passport_guard$;

drop trigger if exists protect_event_stamp_collection_trigger on public.events;
create trigger protect_event_stamp_collection_trigger
  before insert or update on public.events
  for each row execute function public.protect_event_stamp_collection();

insert into public.stamp_collections
  (collection_key,category,edition_year,display_name,theme_key,is_published)
values
  ('christmas-party-2026','christmas_party',2026,'Christmas Party 2026','holiday',true),
  ('ccs-week-2026','ccs_week',2026,'CCS Week 2026','digital',true),
  ('foundation-day-2027','foundation_day',2027,'Foundation Day 2027','heritage',true),
  ('intramurals-2027','intramurals',2027,'Intramurals 2027','victory',true)
on conflict (collection_key) do nothing;

-- A stamp is NOT a writable reward row: it is derived from the student's
-- existing verified attendance where status is 'present' or 'late'.
-- This preserves duplicate protection and removes invalidated stamps automatically.
