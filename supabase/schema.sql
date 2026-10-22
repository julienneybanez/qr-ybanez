-- ============================================================
-- QR-ATT — Supabase PostgreSQL Schema
--
-- CANONICAL / FRESH-INSTALL SCHEMA
--
-- This file represents the current database structure used by
-- QR-Ybanez, including:
--
--   • Student, Teacher, and Admin profiles
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
        'teacher',
        'admin'
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
-- Teacher/Admin:
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
    role in ('teacher', 'admin')
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
-- Admin is intentionally not accepted from public signup metadata.
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
as $profile_guard$
begin

  if new.role is distinct from old.role
     and auth.uid() is not null then

    if not public.is_admin() then
      raise exception
        'Profile role cannot be changed by the client.';
    end if;

    if old.id = auth.uid() then
      raise exception
        'Admins cannot change their own role.';
    end if;

  end if;


  new.updated_at := now();

  return new;

end;
$profile_guard$;


drop trigger
if exists prevent_profile_role_change
on public.profiles;


create trigger prevent_profile_role_change
before update
on public.profiles
for each row
execute procedure public.prevent_profile_role_change();



-- ============================================================
-- ADMIN ROLE CHECK
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $admin$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$admin$;

revoke all
on function public.is_admin()
from public;

grant execute
on function public.is_admin()
to authenticated;


drop policy
if exists "Admins can view all profiles"
on public.profiles;

create policy
"Admins can view all profiles"
on public.profiles
for select
using (
  public.is_admin()
);

drop policy
if exists "Admins can update all profiles"
on public.profiles;

create policy
"Admins can update all profiles"
on public.profiles
for update
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


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

  late_after_minutes integer
    not null
    default 15
    check (
      late_after_minutes between 0 and 240
    ),

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

drop policy
if exists "Admins can insert events"
on public.events;

create policy
"Admins can insert events"
on public.events
for insert
with check (
  auth.uid() = created_by
  and public.is_admin()
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



-- ------------------------------------------------------------
-- Admin event oversight
-- ------------------------------------------------------------

drop policy
if exists "Admins can update all events"
on public.events;

create policy
"Admins can update all events"
on public.events
for update
using (
  public.is_admin()
)
with check (
  public.is_admin()
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

  status text
    not null
    default 'present'
    check (
      status in (
        'present',
        'late',
        'excused'
      )
    ),

  unique (
    student_id,
    event_id
  )
);


alter table public.attendance
enable row level security;


-- ============================================================
-- AUTOMATIC ATTENDANCE STATUS
-- ============================================================

create or replace function public.set_attendance_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $attendance$
declare
  event_start timestamptz;
  late_minutes integer;
begin

  select
    e.start_time,
    e.late_after_minutes
  into
    event_start,
    late_minutes
  from public.events e
  where e.id = new.event_id;


  if event_start is not null
     and new.scanned_at >
       event_start
       + make_interval(
           mins => coalesce(late_minutes, 15)
         ) then

    new.status := 'late';

  else

    new.status := 'present';

  end if;


  return new;

end;
$attendance$;


drop trigger
if exists set_attendance_status_before_insert
on public.attendance;


create trigger set_attendance_status_before_insert
before insert
on public.attendance
for each row
execute procedure public.set_attendance_status();


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
-- Admins may view all attendance.
-- ------------------------------------------------------------

drop policy
if exists "Admins can view all attendance"
on public.attendance;

create policy
"Admins can view all attendance"
on public.attendance
for select
using (
  public.is_admin()
);

drop policy
if exists "Admins can update all attendance"
on public.attendance;

create policy
"Admins can update all attendance"
on public.attendance
for update
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


drop policy
if exists "Admins can delete attendance"
on public.attendance;

create policy
"Admins can delete attendance"
on public.attendance
for delete
using (
  public.is_admin()
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
-- 4. AUDIT LOGS / SYSTEM RECORDS
-- ============================================================

create table if not exists public.audit_logs (
  id uuid primary key
    default gen_random_uuid(),

  actor_id uuid
    references public.profiles (id)
    on delete set null,

  action text
    not null,

  entity_type text
    not null,

  entity_id text,

  details jsonb
    not null
    default '{}'::jsonb,

  created_at timestamptz
    not null
    default now()
);


alter table public.audit_logs
enable row level security;


drop policy
if exists "Admins can view audit logs"
on public.audit_logs;


create policy
"Admins can view audit logs"
on public.audit_logs
for select
using (
  public.is_admin()
);


create or replace function public.audit_event_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $audit_event$
declare
  audit_action text;
begin

  if tg_op = 'INSERT' then

    insert into public.audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      details
    )
    values (
      coalesce(auth.uid(), new.created_by),
      'event_created',
      'event',
      new.id::text,
      jsonb_build_object(
        'title', new.title,
        'event_code', new.event_code,
        'status', new.status
      )
    );

    return new;

  end if;


  if old.status is distinct from new.status
     and new.status = 'closed' then
    audit_action := 'event_closed';
  else
    audit_action := 'event_updated';
  end if;


  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    details
  )
  values (
    auth.uid(),
    audit_action,
    'event',
    new.id::text,
    jsonb_build_object(
      'title', new.title,
      'event_code', new.event_code,
      'old_status', old.status,
      'new_status', new.status
    )
  );


  return new;

end;
$audit_event$;


drop trigger
if exists audit_event_change_trigger
on public.events;


create trigger audit_event_change_trigger
after insert or update
on public.events
for each row
execute procedure public.audit_event_change();


create or replace function public.audit_attendance_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $audit_attendance$
declare
  event_title text;
  event_code_value text;
  event_ref uuid;
begin

  if tg_op = 'DELETE' then
    event_ref := old.event_id;
  else
    event_ref := new.event_id;
  end if;


  select
    e.title,
    e.event_code
  into
    event_title,
    event_code_value
  from public.events e
  where e.id = event_ref;


  if tg_op = 'INSERT' then

    insert into public.audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      details
    )
    values (
      coalesce(auth.uid(), new.student_id),
      'attendance_recorded',
      'attendance',
      new.id::text,
      jsonb_build_object(
        'event_id', new.event_id,
        'event_title', event_title,
        'event_code', event_code_value,
        'status', new.status
      )
    );

    return new;

  end if;


  if tg_op = 'UPDATE' then

    insert into public.audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      details
    )
    values (
      auth.uid(),
      'attendance_updated',
      'attendance',
      new.id::text,
      jsonb_build_object(
        'event_id', new.event_id,
        'event_title', event_title,
        'old_status', old.status,
        'new_status', new.status,
        'student_id', new.student_id
      )
    );

    return new;

  end if;


  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    details
  )
  values (
    auth.uid(),
    'attendance_deleted',
    'attendance',
    old.id::text,
    jsonb_build_object(
      'event_id', old.event_id,
      'event_title', event_title,
      'status', old.status,
      'student_id', old.student_id
    )
  );


  return old;

end;
$audit_attendance$;


drop trigger
if exists audit_attendance_change_trigger
on public.attendance;


create trigger audit_attendance_change_trigger
after insert or update or delete
on public.attendance
for each row
execute procedure public.audit_attendance_change();


create or replace function public.audit_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $audit_profile$
begin

  if old.full_name is not distinct from new.full_name
     and old.role is not distinct from new.role
     and old.student_id is not distinct from new.student_id then
    return new;
  end if;


  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    details
  )
  values (
    auth.uid(),
    'profile_updated',
    'profile',
    new.id::text,
    jsonb_build_object(
      'target_email', new.email,
      'old_role', old.role,
      'new_role', new.role,
      'old_student_id', old.student_id,
      'new_student_id', new.student_id
    )
  );


  return new;

end;
$audit_profile$;


drop trigger
if exists audit_profile_change_trigger
on public.profiles;


create trigger audit_profile_change_trigger
after update
on public.profiles
for each row
execute procedure public.audit_profile_change();


create index
if not exists audit_logs_created_at_idx
on public.audit_logs (created_at desc);

create index
if not exists audit_logs_actor_id_idx
on public.audit_logs (actor_id);


-- ============================================================
-- REPORTING / ADMIN INDEXES
-- ============================================================

create index
if not exists profiles_role_idx
on public.profiles (role);

create index
if not exists events_created_by_idx
on public.events (created_by);

create index
if not exists attendance_event_id_idx
on public.attendance (event_id);

create index
if not exists attendance_scanned_at_idx
on public.attendance (scanned_at);

create index
if not exists attendance_status_idx
on public.attendance (status);


-- ------------------------------------------------------------
-- Realtime attendance monitoring
-- ------------------------------------------------------------

do $realtime$
begin
  alter publication supabase_realtime
  add table public.attendance;
exception
  when duplicate_object then
    null;
end
$realtime$;


-- ============================================================
-- END OF QR-ATT SCHEMA
-- ============================================================

-- ============================================================
-- 5. SECURE QR + MANUAL CHECK-IN + CORRECTION REQUESTS
-- Fresh installations must include this final section.
-- Existing projects should run secure-attendance-migration.sql instead.
-- ============================================================

-- QR-ATT: secure rotating QR, manual check-in, and correction requests.
-- Run after attendance-redesign-migration.sql. Apply BEFORE running the updated app.

-- Data provenance for QR, manual and approved correction records.
alter table public.attendance add column if not exists recorded_via text not null default 'qr';
alter table public.attendance add column if not exists recorded_by uuid references public.profiles(id) on delete set null;
alter table public.attendance add column if not exists checkin_note text;
alter table public.attendance drop constraint if exists attendance_recorded_via_check;
alter table public.attendance add constraint attendance_recorded_via_check
  check (recorded_via in ('qr','manual','correction'));

-- Existing records came from the previous static QR workflow.
update public.attendance set recorded_by=student_id
where recorded_by is null and recorded_via='qr';

-- Prevent forged attendance inserts from the mobile client.
drop policy if exists "Students can insert their own attendance" on public.attendance;
revoke insert on public.attendance from anon, authenticated;

-- The automatic status trigger applies to real-time QR and manual check-ins,
-- but must not overwrite an explicitly approved correction.
create or replace function public.set_attendance_status()
returns trigger language plpgsql security definer set search_path=public
as $status_guard$
declare event_start timestamptz; late_minutes integer;
begin
  if new.recorded_via='correction' then return new; end if;
  select e.start_time,e.late_after_minutes into event_start,late_minutes
  from public.events e where e.id=new.event_id;
  new.status := case
    when event_start is not null and new.scanned_at >
      event_start + make_interval(mins=>coalesce(late_minutes,15))
    then 'late' else 'present' end;
  return new;
end;
$status_guard$;

-- Token values are never stored in plaintext in the database.
create table if not exists public.event_qr_tokens(
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  token_hash text not null unique,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists event_qr_tokens_event_expiry_idx
  on public.event_qr_tokens(event_id,expires_at);
alter table public.event_qr_tokens enable row level security;
revoke all on public.event_qr_tokens from anon,authenticated;

-- Teacher must own the event; Admin can administer any event.
create or replace function public.issue_event_qr(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $issue_qr$
declare
  actor uuid := auth.uid();
  ev public.events%rowtype;
  actor_role text;
  token text;
  issued timestamptz := clock_timestamp();
begin
  if actor is null then raise exception 'Sign in to display event QR.'; end if;
  select role into actor_role from public.profiles where id=actor;
  select * into ev from public.events where id=p_event_id;
  if not found then raise exception 'Event not found.'; end if;
  if actor_role <> 'admin' and not (actor_role='teacher' and ev.created_by=actor) then
    raise exception 'Not authorized for this event.';
  end if;
  if ev.status <> 'open' or (ev.end_time is not null and issued>ev.end_time) then
    raise exception 'This event cannot accept attendance.';
  end if;
  token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  delete from public.event_qr_tokens where event_id=ev.id and expires_at < issued;
  insert into public.event_qr_tokens(event_id,token_hash,issued_at,expires_at)
  values(ev.id,encode(sha256(convert_to(token,'UTF8')),'hex'),issued,issued+interval '40 seconds');
  return jsonb_build_object('event',ev.event_code,'token',token,
    'server_now',issued,'expires_at',issued+interval '40 seconds');
end;
$issue_qr$;

create or replace function public.verify_qr_check_in(p_event_code text,p_token text)
returns jsonb language plpgsql security definer set search_path=public
as $check_qr$
declare
  actor uuid := auth.uid();
  ev public.events%rowtype;
  result public.attendance%rowtype;
  current_at timestamptz := clock_timestamp();
begin
  if actor is null then raise exception 'Sign in to record attendance.'; end if;
  if not exists (select 1 from public.profiles where id=actor and role='student'
      and student_id is not null) then raise exception 'Only Students can check in.'; end if;
  if p_event_code is null or p_token is null or length(p_token)<>64
      or p_token !~ '^[a-f0-9]+$' then raise exception 'Invalid QR code.'; end if;
  select * into ev from public.events where event_code=p_event_code;
  if not found then raise exception 'Event not found.'; end if;
  if not exists(select 1 from public.event_qr_tokens
      where event_id=ev.id
      and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex')
      and expires_at>=current_at and issued_at<=current_at) then
    raise exception 'QR expired or invalid. Scan the latest code.';
  end if;
  if ev.status<>'open' then raise exception 'This event is closed.'; end if;
  if ev.start_time is not null and current_at<ev.start_time then
    raise exception 'Event has not started yet.';
  end if;
  if ev.end_time is not null and current_at>ev.end_time then
    raise exception 'Event has already ended.';
  end if;
  if exists(select 1 from public.attendance where event_id=ev.id and student_id=actor) then
    raise exception 'Already registered for this event.';
  end if;
  insert into public.attendance(student_id,event_id,scanned_at,recorded_via,recorded_by)
  values(actor,ev.id,current_at,'qr',actor) returning * into result;
  return jsonb_build_object('event_title',ev.title,'event_code',ev.event_code,
    'status',result.status,'scanned_at',result.scanned_at,
    'late_after_minutes',ev.late_after_minutes,
    'school_student_id',(select p.student_id from public.profiles p where p.id=actor));
exception when unique_violation then
  raise exception 'Already registered for this event.';
end;
$check_qr$;

-- Authorized Student search for the event's Teacher or Admin.
create or replace function public.search_checkin_students(p_event_id uuid,p_query text)
returns table(id uuid, full_name text, student_id text, email text)
language plpgsql security definer set search_path=public
as $student_search$
declare actor uuid := auth.uid(); ev public.events%rowtype;
begin
  select * into ev from public.events where events.id=p_event_id;
  if not found then raise exception 'Event not found.'; end if;
  if not (public.is_admin() or (ev.created_by=actor and exists(
      select 1 from public.profiles where profiles.id=actor and role='teacher'))) then
    raise exception 'Not authorized to search students.';
  end if;
  if length(trim(coalesce(p_query,'')))<2 then
    raise exception 'Enter at least two characters.';
  end if;
  return query
  select p.id,p.full_name,p.student_id,p.email
  from public.profiles p where p.role='student' and
    (p.student_id ilike '%'||trim(p_query)||'%' or
     p.full_name ilike '%'||trim(p_query)||'%' or
     p.email ilike '%'||trim(p_query)||'%')
  order by p.full_name limit 15;
end;
$student_search$;

create or replace function public.manual_check_in(
  p_event_id uuid,p_student_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public
as $manual_checkin$
declare
 actor uuid:=auth.uid(); ev public.events%rowtype;
 current_at timestamptz:=clock_timestamp(); row_value public.attendance%rowtype;
 admin_actor boolean:=public.is_admin();
begin
  if length(trim(coalesce(p_reason,'')))<5 or length(p_reason)>500 then
    raise exception 'Enter a reason of 5–500 characters.';
  end if;
  select * into ev from public.events where id=p_event_id;
  if not found then raise exception 'Event not found.'; end if;
  if not (admin_actor or (ev.created_by=actor and exists(
    select 1 from public.profiles where id=actor and role='teacher'))) then
    raise exception 'Not authorized for manual check-in.';
  end if;
  if not exists(select 1 from public.profiles where id=p_student_id
    and role='student' and student_id is not null) then
    raise exception 'A valid Student account is required.';
  end if;
  if not admin_actor then
    if ev.status<>'open' then raise exception 'Event is closed.'; end if;
    if ev.start_time is not null and current_at<ev.start_time then
      raise exception 'Event has not started.';
    end if;
    if ev.end_time is not null and current_at>ev.end_time then
      raise exception 'Event has ended.';
    end if;
  end if;
  if exists(select 1 from public.attendance where event_id=p_event_id
    and student_id=p_student_id) then raise exception 'Student already checked in.'; end if;
  insert into public.attendance(student_id,event_id,scanned_at,recorded_via,recorded_by,checkin_note)
  values(p_student_id,p_event_id,current_at,'manual',actor,trim(p_reason))
  returning * into row_value;
  return jsonb_build_object('status',row_value.status,'scanned_at',row_value.scanned_at);
exception when unique_violation then raise exception 'Student already checked in.';
end;
$manual_checkin$;

create table if not exists public.attendance_correction_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  attendance_id uuid references public.attendance(id) on delete set null,
  issue_type text not null check(issue_type in ('incorrect_status','missing','wrong_event','other')),
  requested_status text not null check(requested_status in ('present','late','excused')),
  reason text not null check(char_length(trim(reason)) between 10 and 1000),
  status text not null default 'pending'
    check(status in ('pending','under_review','approved','rejected','cancelled')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index if not exists unique_open_correction_request_per_event
  on public.attendance_correction_requests(student_id,event_id)
  where status in ('pending','under_review');
create index if not exists attendance_requests_event_status_idx
  on public.attendance_correction_requests(event_id,status,created_at desc);
alter table public.attendance_correction_requests enable row level security;
drop policy if exists "Students see own correction requests"
  on public.attendance_correction_requests;
create policy "Students see own correction requests"
  on public.attendance_correction_requests for select
  using(auth.uid()=student_id);
drop policy if exists "Teachers see own event requests"
  on public.attendance_correction_requests;
create policy "Teachers see own event requests"
  on public.attendance_correction_requests for select
  using(exists(select 1 from public.events e
    where e.id=event_id and e.created_by=auth.uid()));
drop policy if exists "Admins see all correction requests"
  on public.attendance_correction_requests;
create policy "Admins see all correction requests"
  on public.attendance_correction_requests for select
  using(public.is_admin());
revoke insert,update,delete on public.attendance_correction_requests from anon,authenticated;
grant select on public.attendance_correction_requests to authenticated;

create or replace function public.submit_attendance_request(
  p_event_id uuid,p_issue_type text,p_requested_status text,p_reason text)
returns uuid language plpgsql security definer set search_path=public
as $submit_request$
declare actor uuid:=auth.uid(); attendance_ref uuid; request_id uuid;
begin
 if not exists(select 1 from public.profiles where id=actor and role='student') then
   raise exception 'Only Students can request corrections.';
 end if;
 if not exists(select 1 from public.events where id=p_event_id) then
   raise exception 'Event not found.';
 end if;
 if p_issue_type not in ('incorrect_status','missing','wrong_event','other')
   or p_requested_status not in ('present','late','excused')
   or length(trim(coalesce(p_reason,''))) not between 10 and 1000 then
   raise exception 'Choose a valid issue, status and explanation (10–1000 characters).';
 end if;
 select id into attendance_ref from public.attendance
 where student_id=actor and event_id=p_event_id;
 if p_issue_type='missing' and attendance_ref is not null then
   raise exception 'You already have attendance for this event.';
 end if;
 if p_issue_type='incorrect_status' and attendance_ref is null then
   raise exception 'Choose Missing Attendance if no record exists.';
 end if;
 insert into public.attendance_correction_requests(
   student_id,event_id,attendance_id,issue_type,requested_status,reason)
 values(actor,p_event_id,attendance_ref,p_issue_type,p_requested_status,trim(p_reason))
 returning id into request_id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
 values(actor,'correction_requested','attendance_request',request_id::text,
   jsonb_build_object('event_id',p_event_id,'issue_type',p_issue_type));
 return request_id;
exception when unique_violation then raise exception 'You already have a pending request for this event.';
end;
$submit_request$;

-- Teachers can acknowledge an event request but cannot change attendance.
create or replace function public.mark_attendance_request_reviewing(p_request_id uuid)
returns void language plpgsql security definer set search_path=public
as $mark_review$
declare actor uuid:=auth.uid(); event_owner uuid;
begin
 select e.created_by into event_owner
 from public.attendance_correction_requests r
 join public.events e on e.id=r.event_id where r.id=p_request_id;
 if not found then raise exception 'Request not found.'; end if;
 if not (public.is_admin() or (event_owner=actor and exists(
   select 1 from public.profiles where id=actor and role='teacher'))) then
   raise exception 'Not authorized.';
 end if;
 update public.attendance_correction_requests set status='under_review'
 where id=p_request_id and status='pending';
 if found then
   insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
   values(actor,'correction_review_started','attendance_request',p_request_id::text,'{}'::jsonb);
 end if;
end;
$mark_review$;

create or replace function public.resolve_attendance_request(
  p_request_id uuid,p_approve boolean,p_notes text)
returns void language plpgsql security definer set search_path=public
as $resolve_request$
declare req public.attendance_correction_requests%rowtype; prior uuid; actor uuid:=auth.uid();
begin
 if not public.is_admin() then raise exception 'Only Admin can resolve requests.'; end if;
 if length(trim(coalesce(p_notes,'')))<5 then
   raise exception 'Provide a review note of at least 5 characters.';
 end if;
 select * into req from public.attendance_correction_requests
 where id=p_request_id for update;
 if not found then raise exception 'Request not found.'; end if;
 if req.status not in ('pending','under_review') then
   raise exception 'This request has already been resolved.';
 end if;
 if p_approve then
   select id into prior from public.attendance
   where student_id=req.student_id and event_id=req.event_id for update;
   if prior is null then
     insert into public.attendance(student_id,event_id,status,scanned_at,
       recorded_via,recorded_by,checkin_note)
     values(req.student_id,req.event_id,req.requested_status,clock_timestamp(),
       'correction',actor,'Approved request: '||trim(p_notes));
   else
     update public.attendance set status=req.requested_status,
       checkin_note='Approved correction: '||trim(p_notes) where id=prior;
   end if;
 end if;
 update public.attendance_correction_requests
 set status=case when p_approve then 'approved' else 'rejected' end,
   reviewed_by=actor,reviewer_notes=trim(p_notes),resolved_at=clock_timestamp()
 where id=req.id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
 values(actor,case when p_approve then 'correction_approved' else 'correction_rejected' end,
   'attendance_request',req.id::text,
   jsonb_build_object('event_id',req.event_id,'student_id',req.student_id,
     'requested_status',req.requested_status,'notes',trim(p_notes)));
end;
$resolve_request$;

-- RPCs alone may modify attendance. Execute privilege is restricted to signed-in users.
revoke all on function public.issue_event_qr(uuid) from public;
revoke all on function public.verify_qr_check_in(text,text) from public;
revoke all on function public.search_checkin_students(uuid,text) from public;
revoke all on function public.manual_check_in(uuid,uuid,text) from public;
revoke all on function public.submit_attendance_request(uuid,text,text,text) from public;
revoke all on function public.mark_attendance_request_reviewing(uuid) from public;
revoke all on function public.resolve_attendance_request(uuid,boolean,text) from public;
grant execute on function public.issue_event_qr(uuid) to authenticated;
grant execute on function public.verify_qr_check_in(text,text) to authenticated;
grant execute on function public.search_checkin_students(uuid,text) to authenticated;
grant execute on function public.manual_check_in(uuid,uuid,text) to authenticated;
grant execute on function public.submit_attendance_request(uuid,text,text,text) to authenticated;
grant execute on function public.mark_attendance_request_reviewing(uuid) to authenticated;
grant execute on function public.resolve_attendance_request(uuid,boolean,text) to authenticated;
do $enable_request_realtime$
begin
 alter publication supabase_realtime add table public.attendance_correction_requests;
exception when duplicate_object then null;
end;
$enable_request_realtime$;


-- Allow Teachers to see basic profiles for students requesting a correction
-- to their own events, including those with no existing attendance record.
drop policy if exists "Teachers see profiles for correction requests" on public.profiles;
create policy "Teachers see profiles for correction requests"
on public.profiles for select
using (exists (
  select 1 from public.attendance_correction_requests r
  join public.events e on e.id=r.event_id
  where r.student_id=profiles.id and e.created_by=auth.uid()
));

-- Admin corrections/deletions must include a human-readable reason.
-- No mobile role may directly UPDATE/DELETE attendance.
revoke update,delete on public.attendance from anon,authenticated;
drop policy if exists "Admins can update all attendance" on public.attendance;
drop policy if exists "Admins can delete attendance" on public.attendance;

create or replace function public.correct_attendance_record(
  p_attendance_id uuid,p_status text,p_reason text)
returns void language plpgsql security definer set search_path=public
as $correct_attendance$
begin
 if not public.is_admin() then raise exception 'Only Admin can correct attendance.'; end if;
 if p_status not in ('present','late','excused') then raise exception 'Invalid status.'; end if;
 if length(trim(coalesce(p_reason,'')))<5 then raise exception 'Enter a reason (at least 5 characters).'; end if;
 update public.attendance set status=p_status,
   checkin_note='Admin correction: '||trim(p_reason)
 where id=p_attendance_id;
 if not found then raise exception 'Attendance record not found.'; end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),'admin_attendance_corrected','attendance',p_attendance_id::text,
   jsonb_build_object('reason',trim(p_reason),'new_status',p_status));
end;
$correct_attendance$;

create or replace function public.remove_attendance_record(
  p_attendance_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=public
as $remove_attendance$
declare old_record public.attendance%rowtype;
begin
 if not public.is_admin() then raise exception 'Only Admin can remove attendance.'; end if;
 if length(trim(coalesce(p_reason,'')))<5 then raise exception 'Enter a reason (at least 5 characters).'; end if;
 select * into old_record from public.attendance where id=p_attendance_id for update;
 if not found then raise exception 'Attendance record not found.'; end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),'admin_attendance_removed','attendance',p_attendance_id::text,
   jsonb_build_object('reason',trim(p_reason),'event_id',old_record.event_id,'student_id',old_record.student_id));
 delete from public.attendance where id=p_attendance_id;
end;
$remove_attendance$;

create or replace function public.cancel_attendance_request(p_request_id uuid)
returns void language plpgsql security definer set search_path=public
as $cancel_request$
begin
 update public.attendance_correction_requests
 set status='cancelled',resolved_at=clock_timestamp()
 where id=p_request_id and student_id=auth.uid() and status in ('pending','under_review');
 if not found then raise exception 'Request cannot be cancelled.'; end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),'correction_cancelled','attendance_request',p_request_id::text,'{}'::jsonb);
end;
$cancel_request$;

revoke all on function public.correct_attendance_record(uuid,text,text) from public;
revoke all on function public.remove_attendance_record(uuid,text) from public;
revoke all on function public.cancel_attendance_request(uuid) from public;
grant execute on function public.correct_attendance_record(uuid,text,text) to authenticated;
grant execute on function public.remove_attendance_record(uuid,text) to authenticated;
grant execute on function public.cancel_attendance_request(uuid) to authenticated;

