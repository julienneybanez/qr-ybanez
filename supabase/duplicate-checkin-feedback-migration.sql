-- Apply to existing QR-ATT Supabase projects after secure-attendance-migration.sql.
-- Replaces only the QR check-in RPC; no table/data changes or history rewrites.

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

revoke all on function public.verify_qr_check_in(text,text) from public;
grant execute on function public.verify_qr_check_in(text,text) to authenticated;
