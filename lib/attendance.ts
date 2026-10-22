import { getEventDisplayStatus } from './events';
import { parseQRPayload } from './qr';
import { supabase } from './supabase';

export type AttendanceStatus = 'present' | 'late' | 'excused';

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventUuid: string;
  eventTitle: string;
  scannedAt: string;
  status: AttendanceStatus;
};

export type RegisterResult = {
  success: boolean;
  alreadyCheckedIn?: boolean;
  message: string;
  eventTitle?: string;
  eventCode?: string;
  attendanceStatus?: AttendanceStatus;
  recordedAt?: string;
  lateAfterMinutes?: number;
  studentNumber?: string | null;
};

export type EventAttendee = {
  attendanceId: string;
  profileId: string;
  studentId: string | null;
  studentName: string | null;
  studentEmail: string | null;
  scannedAt: string;
  status: AttendanceStatus;
  recordedVia: 'qr' | 'manual' | 'correction';
};

export type EventAttendanceGroup = {
  eventId: string;
  eventCode: string;
  title: string;
  venue: string | null;
  startTime: string | null;
  endTime: string | null;
  eventStatus: 'open' | 'closed';
  displayStatus: 'Upcoming' | 'Ongoing' | 'Ended' | 'Closed';
  lateAfterMinutes: number;
  attendeeCount: number;
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  firstCheckIn: string | null;
  lastCheckIn: string | null;
  attendees: EventAttendee[];
};

export type TeacherEventAttendance = EventAttendanceGroup;

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
};

const studentHistoryCache = new Map<string, AttendanceRecord[]>();
const teacherAttendanceCache = new Map<string, TeacherEventAttendance[]>();

export function peekAttendanceHistory(studentId: string) {
  return studentHistoryCache.get(studentId) ?? null;
}

export function peekTeacherEventAttendance(teacherId: string) {
  return teacherAttendanceCache.get(teacherId) ?? null;
}

export function clearAttendanceCaches() {
  studentHistoryCache.clear();
  teacherAttendanceCache.clear();
}

export async function registerAttendance(rawPayload: string, studentId: string): Promise<RegisterResult> {
  const parsed = parseQRPayload(rawPayload);
  if (!parsed.ok) return { success: false, message: parsed.message };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== studentId) {
    return { success: false, message: 'Please sign in again before scanning.' };
  }

  // Database checks the temporary token and all attendance permissions.
  const { data, error } = await supabase.rpc('verify_qr_check_in', {
    p_event_code: parsed.payload.event,
    p_token: parsed.payload.token,
  });
  if (error) return { success: false, message: error.message ?? 'QR verification failed.' };

  const result = data as {
    outcome?: 'recorded' | 'already_checked_in';
    event_title: string;
    event_code: string;
    status: AttendanceStatus;
    scanned_at: string;
    late_after_minutes: number;
    school_student_id: string | null;
  };
  const alreadyCheckedIn = result.outcome === 'already_checked_in';

  if (!alreadyCheckedIn) {
    studentHistoryCache.delete(studentId);
    teacherAttendanceCache.clear();
  }

  return {
    success: !alreadyCheckedIn,
    alreadyCheckedIn,
    message: alreadyCheckedIn
      ? 'Your attendance for this event has already been recorded. You do not need to scan again.'
      : result.status === 'late'
        ? 'Attendance recorded as Late.'
        : 'Attendance recorded as Present.',
    eventTitle: result.event_title,
    eventCode: result.event_code,
    attendanceStatus: result.status,
    recordedAt: result.scanned_at,
    lateAfterMinutes: result.late_after_minutes,
    studentNumber: result.school_student_id,
  };
}

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, scanned_at, status, events ( id, event_code, title )')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (error || !data) {
    return studentHistoryCache.get(studentId) ?? [];
  }

  const rows = data.map((row: any) => ({
    id: row.id,
    eventId: row.events?.event_code ?? '',
    eventUuid: row.events?.id ?? '',
    eventTitle: row.events?.title ?? '',
    scannedAt: row.scanned_at,
    status: (row.status ?? 'present') as AttendanceStatus,
  }));

  studentHistoryCache.set(studentId, rows);
  return rows;
}

export type TeacherAttendanceLoadResult = {
  data: TeacherEventAttendance[];
  error: string | null;
};

export async function getTeacherEventAttendanceResult(
  teacherId: string
): Promise<TeacherAttendanceLoadResult> {
  // Fetch events independently so an attendee/profile error never hides events.
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, venue, status, start_time, end_time, late_after_minutes, created_by, created_at')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) {
    return {
      data: teacherAttendanceCache.get(teacherId) ?? [],
      error: eventError?.message ?? 'Could not load your events.',
    };
  }

  if (events.length === 0) {
    teacherAttendanceCache.set(teacherId, []);
    return { data: [], error: null };
  }

  const eventIds = events.map((event: any) => event.id as string);

  // Do not embed profiles: attendance.recorded_by and student_id refer to
  // different identities (a manual check-in is recorded by the Teacher/Admin).
  // Look up the attendee using attendance.student_id explicitly.
  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('id, student_id, scanned_at, status, recorded_via, event_id')
    .in('event_id', eventIds)
    .order('scanned_at', { ascending: false });

  const attendanceRows = (attendance ?? []) as Array<{
    id: string;
    student_id: string;
    scanned_at: string;
    status: AttendanceStatus | null;
    recorded_via: 'qr' | 'manual' | 'correction' | null;
    event_id: string;
  }>;

  const studentIds = [...new Set(attendanceRows.map((row) => row.student_id))];
  const profileResult = studentIds.length
    ? await supabase
        .from('profiles')
        .select('id, full_name, email, student_id')
        .in('id', studentIds)
    : null;

  const profilesById = new Map<string, {
    full_name: string | null;
    email: string | null;
    student_id: string | null;
  }>();

  for (const profile of profileResult?.data ?? []) {
    profilesById.set(profile.id, profile);
  }

  const groupedAttendance = new Map<string, EventAttendee[]>();
  for (const row of attendanceRows) {
    const student = profilesById.get(row.student_id);
    const attendee: EventAttendee = {
      attendanceId: row.id,
      profileId: row.student_id,
      studentId: student?.student_id ?? null,
      studentName: student?.full_name ?? null,
      studentEmail: student?.email ?? null,
      scannedAt: row.scanned_at,
      status: row.status ?? 'present',
      recordedVia: row.recorded_via ?? 'qr',
    };
    const list = groupedAttendance.get(row.event_id) ?? [];
    list.push(attendee);
    groupedAttendance.set(row.event_id, list);
  }

  const result: TeacherEventAttendance[] = events.map((event: any) => {
    const attendees = groupedAttendance.get(event.id) ?? [];
    const timestamps = attendees
      .map((attendee) => new Date(attendee.scannedAt).getTime())
      .filter(Number.isFinite);

    const cloudEvent = {
      id: event.id,
      event_code: event.event_code,
      title: event.title,
      venue: event.venue,
      description: null,
      status: event.status,
      start_time: event.start_time,
      end_time: event.end_time,
      late_after_minutes: event.late_after_minutes ?? 15,
      created_by: event.created_by,
      created_at: event.created_at,
    };

    return {
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      venue: event.venue ?? null,
      startTime: event.start_time,
      endTime: event.end_time,
      eventStatus: event.status,
      displayStatus: getEventDisplayStatus(cloudEvent),
      lateAfterMinutes: event.late_after_minutes ?? 15,
      attendeeCount: attendees.length,
      presentCount: attendees.filter((item) => item.status === 'present').length,
      lateCount: attendees.filter((item) => item.status === 'late').length,
      excusedCount: attendees.filter((item) => item.status === 'excused').length,
      firstCheckIn:
        timestamps.length > 0 ? new Date(Math.min(...timestamps)).toISOString() : null,
      lastCheckIn:
        timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : null,
      attendees,
    };
  });

  const error = attendanceError
    ? 'Events loaded, but attendance could not be loaded: ' + attendanceError.message
    : profileResult?.error
      ? 'Attendance loaded, but some student details could not be loaded: ' + profileResult.error.message
      : null;

  if (!error) teacherAttendanceCache.set(teacherId, result);
  return { data: result, error };
}

// Preserve existing callers, including Teacher Home and event summaries.
export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  const result = await getTeacherEventAttendanceResult(teacherId);
  return result.data;
}

export async function getTeacherEventSummary(
  teacherId: string
): Promise<TeacherEventSummary[]> {
  const events = await getTeacherEventAttendance(teacherId);

  return events.map((event) => ({
    eventId: event.eventId,
    eventCode: event.eventCode,
    title: event.title,
    attendeeCount: event.attendeeCount,
  }));
}
