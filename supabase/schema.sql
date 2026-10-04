-- ============================================================
-- QR-ATT — Supabase PostgreSQL Schema
--
-- CANONICAL / FRESH-INSTALL SCHEMA
--
-- Use this file when creating a brand-new Supabase database.
-- If your current QR-Ybanez database already exists, DO NOT use
-- this as the upgrade script. Run:
--
-- supabase/migrations/20261004_event_management_qr_security.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES TABLE
-- Stored per-user profile that references Supabase Auth.
-- Created automatically for each newly signed-up user.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'student'
    check (role in ('student', 'teacher')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Profiles policies
drop policy if exists "Profiles are viewable by owner" on public.profiles;

create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Automatically create a profile after a user signs up.
-- full_name and role come from Supabase Auth user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := new.raw_user_meta_data ->> 'role';

  insert into public.profiles (
    id,
    email,
    full_name,
    role
  )
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when requested_role in ('student', 'teacher')
        then requested_role
      else 'student'
    end
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Prevent an authenticated client from changing its own role.
-- SQL Editor/server-side operations are still allowed because
-- auth.uid() is null outside an authenticated client request.
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null then
    raise exception 'Profile role cannot be changed by the client.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_change on public.profiles;

create trigger prevent_profile_role_change
  before update on public.profiles
  for each row execute procedure public.prevent_profile_role_change();

-- ------------------------------------------------------------
-- 2. EVENTS TABLE
-- Represents an attendance event.
-- event_code is the public identifier embedded in the QR code.
-- ------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_code text not null unique,
  title text not null,
  venue text,
  description text,
  status text not null default 'open'
    check (status in ('open', 'closed')),
  start_time timestamptz,
  end_time timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

-- Any authenticated user can read events.
-- Students need this to validate scanned event QR codes.
drop policy if exists "Events are readable by any authenticated user"
  on public.events;

create policy "Events are readable by any authenticated user"
  on public.events for select
  using (auth.role() = 'authenticated');

-- Only teachers can create events.
drop policy if exists "Users can insert events" on public.events;
drop policy if exists "Teachers can insert events" on public.events;

create policy "Teachers can insert events"
  on public.events for insert
  with check (
    auth.uid() = created_by
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
    )
  );

-- Teachers can update only events they created.
drop policy if exists "Users can update their own events" on public.events;
drop policy if exists "Teachers can update their own events" on public.events;

create policy "Teachers can update their own events"
  on public.events for update
  using (
    auth.uid() = created_by
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
    )
  )
  with check (
    auth.uid() = created_by
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
    )
  );

-- ------------------------------------------------------------
-- 3. ATTENDANCE TABLE
-- Records one student's attendance for one event.
-- ------------------------------------------------------------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  scanned_at timestamptz not null default now(),
  unique (student_id, event_id)
);

alter table public.attendance enable row level security;

-- ------------------------------------------------------------
-- Direct attendance -> profiles relationship
-- Required so Supabase/PostgREST can resolve profiles(...)
-- when loading names in the teacher History screen.
-- ------------------------------------------------------------
alter table public.attendance
  drop constraint if exists attendance_student_profile_fkey;

alter table public.attendance
  add constraint attendance_student_profile_fkey
  foreign key (student_id)
  references public.profiles (id)
  on delete cascade;

-- ------------------------------------------------------------
-- Attendance policies
-- ------------------------------------------------------------

-- Students can view only their own attendance.
drop policy if exists "Students can view their own attendance"
  on public.attendance;

create policy "Students can view their own attendance"
  on public.attendance for select
  using (auth.uid() = student_id);

-- Students can insert only their own attendance and only when
-- the target event is open and currently accepting attendance.
drop policy if exists "Students can insert their own attendance"
  on public.attendance;

create policy "Students can insert their own attendance"
  on public.attendance for insert
  with check (
    auth.uid() = student_id

    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'student'
    )

    and exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.status = 'open'
        and (
          e.start_time is null
          or now() >= e.start_time
        )
        and (
          e.end_time is null
          or now() <= e.end_time
        )
    )
  );

-- Teachers can view attendance for events they created.
drop policy if exists "Teachers can view attendance for their events"
  on public.attendance;

create policy "Teachers can view attendance for their events"
  on public.attendance for select
  using (
    exists (
      select 1
      from public.events e
      where e.id = attendance.event_id
        and e.created_by = auth.uid()
    )
  );

-- Teachers can read profiles of students who attended their events.
-- Needed to show student names in the teacher History screen.
drop policy if exists "Teachers can view profiles of their attendees"
  on public.profiles;

create policy "Teachers can view profiles of their attendees"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.attendance a
      join public.events e
        on e.id = a.event_id
      where a.student_id = profiles.id
        and e.created_by = auth.uid()
    )
  );

-- ============================================================
-- END OF SCHEMA
-- ============================================================
