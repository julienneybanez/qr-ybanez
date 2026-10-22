import { supabase } from './supabase';
import type { AttendanceStatus } from './attendance';

export type IssuedEventToken = {
  event: string;
  token: string;
  server_now: string;
  expires_at: string;
};

export async function issueEventToken(eventId: string): Promise<{
  data: IssuedEventToken | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('issue_event_qr', { p_event_id: eventId });
  return { data: error ? null : data as IssuedEventToken, error: error?.message ?? null };
}

export type SchoolStudent = {
  id: string;
  full_name: string | null;
  student_id: string | null;
  email: string;
};

export async function searchCheckinStudents(eventId: string, query: string) {
  const { data, error } = await supabase.rpc('search_checkin_students', {
    p_event_id: eventId,
    p_query: query.trim(),
  });
  return { data: (data ?? []) as SchoolStudent[], error: error?.message ?? null };
}

export async function manualCheckIn(eventId: string, studentProfileId: string, reason: string) {
  const { data, error } = await supabase.rpc('manual_check_in', {
    p_event_id: eventId,
    p_student_id: studentProfileId,
    p_reason: reason.trim(),
  });
  return { data, error: error?.message ?? null };
}

export type CorrectionIssue = 'incorrect_status' | 'missing' | 'wrong_event' | 'other';
export type CorrectionState = 'pending' | 'under_review' | 'approved' | 'rejected' | 'cancelled';

export type CorrectionRequest = {
  id: string;
  event_id: string;
  student_id: string;
  attendance_id: string | null;
  issue_type: CorrectionIssue;
  requested_status: AttendanceStatus;
  reason: string;
  status: CorrectionState;
  reviewer_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  events?: { title: string; event_code: string } | null;
  profiles?: { full_name: string | null; student_id: string | null } | null;
};

export async function getCorrectionRequests(eventId?: string, studentId?: string) {
  let query = supabase.from('attendance_correction_requests')
    .select('id, event_id, student_id, attendance_id, issue_type, requested_status, reason, status, reviewer_notes, created_at, resolved_at, events (title, event_code), profiles (full_name, student_id)')
    .order('created_at', { ascending: false });

  if (eventId) query = query.eq('event_id', eventId);
  if (studentId) query = query.eq('student_id', studentId);

  const { data, error } = await query;
  return { data: (data ?? []) as unknown as CorrectionRequest[], error: error?.message ?? null };
}

export async function submitCorrectionRequest(input: {
  eventId: string;
  issue: CorrectionIssue;
  requestedStatus: AttendanceStatus;
  reason: string;
}) {
  const { error } = await supabase.rpc('submit_attendance_request', {
    p_event_id: input.eventId,
    p_issue_type: input.issue,
    p_requested_status: input.requestedStatus,
    p_reason: input.reason.trim(),
  });
  return { error: error?.message ?? null };
}

export async function markCorrectionReviewing(requestId: string) {
  const { error } = await supabase.rpc('mark_attendance_request_reviewing', {
    p_request_id: requestId,
  });
  return { error: error?.message ?? null };
}

export async function resolveCorrectionRequest(requestId: string, approve: boolean, notes: string) {
  const { error } = await supabase.rpc('resolve_attendance_request', {
    p_request_id: requestId,
    p_approve: approve,
    p_notes: notes.trim(),
  });
  return { error: error?.message ?? null };
}

export async function cancelCorrectionRequest(requestId: string) {
  const { error } = await supabase.rpc('cancel_attendance_request', {
    p_request_id: requestId,
  });
  return { error: error?.message ?? null };
}
