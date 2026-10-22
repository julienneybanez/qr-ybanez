-- QR-ATT ADMIN IMPROVEMENTS MIGRATION
-- Run once in Supabase SQL Editor on the existing project.

-- ============================================================
-- ADMIN HELPER
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;


-- ============================================================
-- EVENT LATE THRESHOLD
-- ============================================================

alter table public.events
add column if not exists late_after_minutes integer
not null
default 15;

alter table public.events
drop constraint if exists events_late_after_minutes_check;

alter table public.events
add constraint events_late_after_minutes_check
check (
  late_after_minutes between 0 and 240
);


-- ============================================================
-- ATTENDANCE STATUS
-- ============================================================

alter table public.attendance
add column if not exists status text
not null
default 'present';

alter table public.attendance
drop constraint if exists attendance_status_check;

alter table public.attendance
add constraint attendance_status_check
check (
  status in (
    'present',
    'late',
    'excused'
  )
);

update public.attendance a
set status =
  case
    when e.start_time is not null
      and a.scanned_at >
        e.start_time
        + make_interval(
            mins => coalesce(e.late_after_minutes, 15)
          )
    then 'late'
    else 'present'
  end
from public.events e
where e.id = a.event_id
  and a.status <> 'excused';


create or replace function public.set_attendance_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
$$;

drop trigger
if exists set_attendance_status_before_insert
on public.attendance;

create trigger set_attendance_status_before_insert
before insert
on public.attendance
for each row
execute procedure public.set_attendance_status();


-- ============================================================
-- ADMIN USER MANAGEMENT
-- ============================================================

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
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
$$;

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
-- ADMIN EVENT MANAGEMENT
-- ============================================================

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
-- ADMIN ATTENDANCE CORRECTION
-- ============================================================

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


-- ============================================================
-- REPORTING / REALTIME
-- ============================================================

create index
if not exists attendance_status_idx
on public.attendance (status);

do $$
begin
  alter publication supabase_realtime
  add table public.attendance;
exception
  when duplicate_object then
    null;
end
$$;
