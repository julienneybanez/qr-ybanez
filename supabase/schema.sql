-- ============================================================
-- QR-ATT — Supabase PostgreSQL Schema
--
-- CANONICAL / FRESH-INSTALL SCHEMA
--
-- This file represents the current database structure used by
-- QR-Ybanez, including:
--
--   • Student and Teacher profiles
--   • School-issued Student IDs
--   • Event management
--   • Secure QR attendance validation
--   • Role-based Row Level Security (RLS)
--
-- IMPORTANT:
-- This is the canonical schema for a NEW Supabase project.
-- Do not rerun the entire file on the existing production
-- database unless you intentionally want to recreate/update
-- its database objects.
-- ============================================================


-- ============================================================
-- 1. PROFILES
-- ============================================================

-- Each authenticated user has one profile.
--
-- profiles.id
--   = Supabase Auth UUID
--
-- profiles.student_id
--   = actual school-issued Student ID
--     (example: 20242043)
--
-- Student accounts must have a Student ID.
-- Teacher accounts must NOT have a Student ID.
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key
    references auth.users (id)
    on delete cascade,

  email text not null,

  full_name text,

  role text not null
    default 'student'
    check (
      role in (
        'student',
        'teacher'
      )
    ),

  student_id text,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


-- ------------------------------------------------------------
-- Student ID uniqueness
-- ------------------------------------------------------------

create unique index
if not exists profiles_student_id_unique
on public.profiles (student_id)
where student_id is not null;


-- ------------------------------------------------------------
-- Student ID / role consistency
--
-- Student:
--   student_id is required
--
-- Teacher:
--   student_id must be NULL
-- ------------------------------------------------------------

alter table public.profiles
drop constraint
if exists profiles_student_id_role_check;

alter table public.profiles
add constraint profiles_student_id_role_check
check (
  (
    role = 'student'
    and student_id is not null
  )
  or
  (
    role = 'teacher'
    and student_id is null
  )
);


-- ------------------------------------------------------------
-- Enable Row Level Security
-- ------------------------------------------------------------

alter table public.profiles
enable row level security;


-- ------------------------------------------------------------
-- Profiles RLS policies
-- ------------------------------------------------------------

drop policy
if exists "Profiles are viewable by owner"
on public.profiles;

create policy
"Profiles are viewable by owner"
on public.profiles
for select
using (
  auth.uid() = id
);


drop policy
if exists "Users can insert their own profile"
on public.profiles;

create policy
"Users can insert their own profile"
on public.profiles
for insert
with check (
  auth.uid() = id
);


drop policy
if exists "Users can update their own profile"
on public.profiles;

create policy
"Users can update their own profile"
on public.profiles
for update
using (
  auth.uid() = id
)
with check (
  auth.uid() = id
);


-- ============================================================
-- AUTOMATIC PROFILE CREATION
-- ============================================================
--
-- Creates a public.profiles record whenever a new Supabase
-- Auth user is created.
--
-- Metadata expected from the app:
--
--   full_name
--   role
--   student_id
--
-- Students must supply a Student ID.
-- Teachers always receive student_id = NULL.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  requested_student_id text;
begin

  requested_role :=
    case
      when new.raw_user_meta_data ->> 'role'
        in (
          'student',
          'teacher'
        )
      then
        new.raw_user_meta_data ->> 'role'

      else
        'student'
    end;


  requested_student_id :=
    nullif(
      trim(
        new.raw_user_meta_data ->> 'student_id'
      ),
      ''
    );


  -- Students must have a Student ID.
  if requested_role = 'student'
     and requested_student_id is null then

    raise exception
      'Student ID is required for student accounts.';

  end if;


  -- Teachers never use a Student ID.
  if requested_role = 'teacher' then
    requested_student_id := null;
  end if;


  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    student_id
  )
  values (
    new.id,

    new.email,

    nullif(
      trim(
        new.raw_user_meta_data ->> 'full_name'
      ),
      ''
    ),

    requested_role,

    requested_student_id
  );


  return new;

end;
$$;


drop trigger
if exists on_auth_user_created
on auth.users;


create trigger on_auth_user_created
after insert
on auth.users
for each row
execute procedure public.handle_new_user();


-- ============================================================
-- PREVENT ROLE CHANGES FROM THE CLIENT
-- ============================================================
--
-- Users may edit their permitted profile information through
-- the app, but authenticated clients cannot change their own
-- role.
--
-- SQL Editor / server-side operations still work because
-- auth.uid() is NULL outside an authenticated client request.
-- ============================================================

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if new.role is distinct from old.role
     and auth.uid() is not null then

    raise exception
      'Profile role cannot be changed by the client.';

  end if;


  new.updated_at := now();

  return new;

end;
$$;


drop trigger
if exists prevent_profile_role_change
on public.profiles;


create trigger prevent_profile_role_change
before update
on public.profiles
for each row
execute procedure public.prevent_profile_role_change();



-- ============================================================
-- 2. EVENTS
-- ============================================================
--
-- Represents a school attendance event.
--
-- event_code:
--   Public identifier encoded inside the QR payload.
--
-- status:
--   open   = attendance may be accepted depending on schedule
--   closed = manually closed by the teacher
--
-- Display states such as Upcoming, Ongoing, and Ended are
-- calculated by the application using start_time/end_time.
-- ============================================================

create table if not exists public.events (
  id uuid primary key
    default gen_random_uuid(),

  event_code text
    not null
    unique,

  title text
    not null,

  venue text,

  description text,

  status text
    not null
    default 'open'
    check (
      status in (
        'open',
        'closed'
      )
    ),

  start_time timestamptz,

  end_time timestamptz,

  created_by uuid
    references auth.users (id)
    on delete set null,

  created_at timestamptz
    not null
    default now()
);


alter table public.events
enable row level security;


-- ------------------------------------------------------------
-- Event read access
--
-- Authenticated Students need to read events so scanned QR
-- codes can be validated against the real database record.
-- ------------------------------------------------------------

drop policy
if exists "Events are readable by any authenticated user"
on public.events;


create policy
"Events are readable by any authenticated user"
on public.events
for select
using (
  auth.role() = 'authenticated'
);


-- ------------------------------------------------------------
-- Event creation
--
-- Only Teacher accounts may create events.
-- The created_by value must match the authenticated user.
-- ------------------------------------------------------------

drop policy
if exists "Users can insert events"
on public.events;

drop policy
if exists "Teachers can insert events"
on public.events;


create policy
"Teachers can insert events"
on public.events
for insert
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
-- Event updates
--
-- Teachers may update only events they created.
-- ------------------------------------------------------------

drop policy
if exists "Users can update their own events"
on public.events;

drop policy
if exists "Teachers can update their own events"
on public.events;


create policy
"Teachers can update their own events"
on public.events
for update

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



-- ============================================================
-- 3. ATTENDANCE
-- ============================================================
--
-- Records one Student's attendance for one Event.
--
-- IMPORTANT:
--
-- attendance.student_id contains the Student's PROFILE/AUTH UUID.
-- It does NOT contain the school-issued Student ID.
--
-- Example:
--
-- profiles.id
--   = 06f19cc8-75ad-4a2e-8ac0-3bf316151378
--
-- profiles.student_id
--   = 20242043
--
-- attendance.student_id
--   = 06f19cc8-75ad-4a2e-8ac0-3bf316151378
--
-- This preserves proper relational database keys while allowing
-- the school-issued ID to be displayed separately.
-- ============================================================

create table if not exists public.attendance (
  id uuid primary key
    default gen_random_uuid(),

  student_id uuid
    not null
    references auth.users (id)
    on delete cascade,

  event_id uuid
    not null
    references public.events (id)
    on delete cascade,

  scanned_at timestamptz
    not null
    default now(),

  unique (
    student_id,
    event_id
  )
);


alter table public.attendance
enable row level security;


-- ============================================================
-- ATTENDANCE -> PROFILE RELATIONSHIP
-- ============================================================
--
-- This direct foreign key allows Supabase/PostgREST to resolve:
--
-- attendance
--   -> profiles
--
-- It is used by the Teacher History screen to retrieve:
--
--   • Student name
--   • School-issued Student ID
-- ============================================================

alter table public.attendance
drop constraint
if exists attendance_student_profile_fkey;


alter table public.attendance
add constraint attendance_student_profile_fkey
foreign key (student_id)
references public.profiles (id)
on delete cascade;



-- ============================================================
-- ATTENDANCE RLS POLICIES
-- ============================================================


-- ------------------------------------------------------------
-- Students may view only their own attendance.
-- ------------------------------------------------------------

drop policy
if exists "Students can view their own attendance"
on public.attendance;


create policy
"Students can view their own attendance"
on public.attendance
for select
using (
  auth.uid() = student_id
);


-- ------------------------------------------------------------
-- Students may register only their own attendance.
--
-- Attendance is accepted only when:
--
--   • Logged-in account owns the attendance record
--   • Account role is Student
--   • Event exists
--   • Event is open
--   • Event has started
--   • Event has not ended
--
-- Duplicate attendance is also prevented by:
--
--   UNIQUE(student_id, event_id)
-- ------------------------------------------------------------

drop policy
if exists "Students can insert their own attendance"
on public.attendance;


create policy
"Students can insert their own attendance"
on public.attendance
for insert
with check (

  auth.uid() = student_id


  and exists (
    select 1

    from public.profiles p

    where p.id = auth.uid()
      and p.role = 'student'
      and p.student_id is not null
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


-- ------------------------------------------------------------
-- Teachers may view attendance only for events they created.
-- ------------------------------------------------------------

drop policy
if exists "Teachers can view attendance for their events"
on public.attendance;


create policy
"Teachers can view attendance for their events"
on public.attendance
for select
using (

  exists (
    select 1

    from public.events e

    where e.id = attendance.event_id
      and e.created_by = auth.uid()
  )
);


-- ------------------------------------------------------------
-- Teachers may read profile information for Students who
-- attended their own events.
--
-- Required by Teacher History for:
--
--   • Student full name
--   • Student ID
-- ------------------------------------------------------------

drop policy
if exists "Teachers can view profiles of their attendees"
on public.profiles;


create policy
"Teachers can view profiles of their attendees"
on public.profiles
for select
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
-- END OF QR-ATT SCHEMA
-- ============================================================