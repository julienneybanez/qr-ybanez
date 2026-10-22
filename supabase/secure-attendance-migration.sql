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
  existing public.attendance%rowtype;
  current_at timestamptz := clock_timestamp();
  school_student_id text;
begin
  if actor is null then raise exception 'Sign in to record attendance.'; end if;

  select p.student_id into school_student_id
  from public.profiles p where p.id=actor and p.role='student';
  if school_student_id is null then
    raise exception 'Only Students with a Student ID can check in.';
  end if;

  if p_event_code is null or p_token is null or length(p_token)<>64
      or p_token !~ '^[a-f0-9]+$' then raise exception 'Invalid QR code.'; end if;

  select * into ev from public.events where event_code=p_event_code;
  if not found then raise exception 'Event not found.'; end if;

  -- A verified Student's already-recorded attendance takes priority over
  -- token expiry and event closure. Do not alter the original record.
  select * into existing from public.attendance a
  where a.event_id=ev.id and a.student_id=actor;
  if found then
    return jsonb_build_object(
      'outcome','already_checked_in',
      'event_title',ev.title,
      'event_code',ev.event_code,
      'status',existing.status,
      'scanned_at',existing.scanned_at,
      'late_after_minutes',ev.late_after_minutes,
      'school_student_id',school_student_id
    );
  end if;

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

  insert into public.attendance(student_id,event_id,scanned_at,recorded_via,recorded_by)
  values(actor,ev.id,current_at,'qr',actor) returning * into result;

  return jsonb_build_object(
    'outcome','recorded',
    'event_title',ev.title,
    'event_code',ev.event_code,
    'status',result.status,
    'scanned_at',result.scanned_at,
    'late_after_minutes',ev.late_after_minutes,
    'school_student_id',school_student_id
  );

exception when unique_violation then
  -- A concurrent scan may have won the unique(student_id,event_id) race.
  select * into existing from public.attendance a
  where a.event_id=ev.id and a.student_id=actor;
  if found then
    return jsonb_build_object(
      'outcome','already_checked_in',
      'event_title',ev.title,
      'event_code',ev.event_code,
      'status',existing.status,
      'scanned_at',existing.scanned_at,
      'late_after_minutes',ev.late_after_minutes,
      'school_student_id',school_student_id
    );
  end if;
  raise;
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
