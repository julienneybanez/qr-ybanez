-- QR-ATT ATTENDANCE REDESIGN / FINAL POLISH MIGRATION
-- Safe to run once on the existing project. Repeats critical prior changes idempotently.

-- ============================================================
-- ADMIN HELPER
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

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;


-- ============================================================
-- EVENT / ATTENDANCE COLUMNS
-- ============================================================

alter table public.events
add column if not exists late_after_minutes integer
not null
default 15;

alter table public.events
drop constraint if exists events_late_after_minutes_check;

alter table public.events
add constraint events_late_after_minutes_check
check (late_after_minutes between 0 and 240);


alter table public.attendance
add column if not exists status text
not null
default 'present';

alter table public.attendance
drop constraint if exists attendance_status_check;

alter table public.attendance
add constraint attendance_status_check
check (status in ('present','late','excused'));


create or replace function public.set_attendance_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $attendance_status$
declare
  event_start timestamptz;
  late_minutes integer;
begin
  select e.start_time, e.late_after_minutes
  into event_start, late_minutes
  from public.events e
  where e.id = new.event_id;

  if event_start is not null
     and new.scanned_at >
       event_start + make_interval(mins => coalesce(late_minutes,15)) then
    new.status := 'late';
  else
    new.status := 'present';
  end if;

  return new;
end;
$attendance_status$;

drop trigger if exists set_attendance_status_before_insert on public.attendance;

create trigger set_attendance_status_before_insert
before insert on public.attendance
for each row
execute procedure public.set_attendance_status();


-- ============================================================
-- ADMIN WRITE POLICIES
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
      raise exception 'Profile role cannot be changed by the client.';
    end if;

    if old.id = auth.uid() then
      raise exception 'Admins cannot change their own role.';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$profile_guard$;

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can insert events" on public.events;
create policy "Admins can insert events"
on public.events for insert
with check (auth.uid() = created_by and public.is_admin());

drop policy if exists "Admins can update all events" on public.events;
create policy "Admins can update all events"
on public.events for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can view all attendance" on public.attendance;
create policy "Admins can view all attendance"
on public.attendance for select
using (public.is_admin());

drop policy if exists "Admins can update all attendance" on public.attendance;
create policy "Admins can update all attendance"
on public.attendance for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete attendance" on public.attendance;
create policy "Admins can delete attendance"
on public.attendance for delete
using (public.is_admin());


-- ============================================================
-- AUDIT LOGS
-- ============================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

drop policy if exists "Admins can view audit logs" on public.audit_logs;
create policy "Admins can view audit logs"
on public.audit_logs for select
using (public.is_admin());

create index if not exists audit_logs_created_at_idx
on public.audit_logs(created_at desc);

create index if not exists audit_logs_actor_id_idx
on public.audit_logs(actor_id);


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
    audit_action := 'event_created';

    insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
    values(
      coalesce(auth.uid(),new.created_by),
      audit_action,
      'event',
      new.id::text,
      jsonb_build_object(
        'title',new.title,
        'event_code',new.event_code,
        'status',new.status
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

  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
  values(
    auth.uid(),
    audit_action,
    'event',
    new.id::text,
    jsonb_build_object(
      'title',new.title,
      'event_code',new.event_code,
      'old_status',old.status,
      'new_status',new.status
    )
  );

  return new;
end;
$audit_event$;

drop trigger if exists audit_event_change_trigger on public.events;

create trigger audit_event_change_trigger
after insert or update on public.events
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

  select e.title,e.event_code
  into event_title,event_code_value
  from public.events e
  where e.id = event_ref;

  if tg_op = 'INSERT' then
    insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
    values(
      coalesce(auth.uid(),new.student_id),
      'attendance_recorded',
      'attendance',
      new.id::text,
      jsonb_build_object(
        'event_id',new.event_id,
        'event_title',event_title,
        'event_code',event_code_value,
        'status',new.status
      )
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
    values(
      auth.uid(),
      'attendance_updated',
      'attendance',
      new.id::text,
      jsonb_build_object(
        'event_id',new.event_id,
        'event_title',event_title,
        'old_status',old.status,
        'new_status',new.status,
        'student_id',new.student_id
      )
    );
    return new;
  end if;

  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
  values(
    auth.uid(),
    'attendance_deleted',
    'attendance',
    old.id::text,
    jsonb_build_object(
      'event_id',old.event_id,
      'event_title',event_title,
      'status',old.status,
      'student_id',old.student_id
    )
  );

  return old;
end;
$audit_attendance$;

drop trigger if exists audit_attendance_change_trigger on public.attendance;

create trigger audit_attendance_change_trigger
after insert or update or delete on public.attendance
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

  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
  values(
    auth.uid(),
    'profile_updated',
    'profile',
    new.id::text,
    jsonb_build_object(
      'target_email',new.email,
      'old_role',old.role,
      'new_role',new.role,
      'old_student_id',old.student_id,
      'new_student_id',new.student_id
    )
  );

  return new;
end;
$audit_profile$;

drop trigger if exists audit_profile_change_trigger on public.profiles;

create trigger audit_profile_change_trigger
after update on public.profiles
for each row
execute procedure public.audit_profile_change();


-- ============================================================
-- REALTIME + INDEXES
-- ============================================================

create index if not exists attendance_status_idx
on public.attendance(status);

do $realtime_attendance$
begin
  alter publication supabase_realtime add table public.attendance;
exception when duplicate_object then
  null;
end
$realtime_attendance$;
