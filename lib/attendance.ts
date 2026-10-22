import { getEventByCode, getEventDisplayStatus } from './events';
import { getProfile } from './profiles';
import { parseQRPayload } from './qr';
import { supabase } from './supabase';

export type AttendanceStatus = 'present' | 'late' | 'excused';

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
  status: AttendanceStatus;
};

export type RegisterResult = {
  success: boolean;
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

export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  const parsed = parseQRPayload(rawPayload);

  if (!parsed.ok) {
    return { success: false, message: parsed.message };
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== studentId) {
    return { success: false, message: 'Please sign in again before scanning.' };
  }

  const profile = await getProfile(user.id);

  if (!profile || profile.role !== 'student') {
    return { success: false, message: 'Only student accounts can record attendance.' };
  }

  if (!profile.student_id) {
    return {
      success: false,
      message: 'Your account does not have a Student ID. Please contact an administrator.',
    };
  }

  const event = await getEventByCode(parsed.payload.event);

  if (!event) {
    return { success: false, message: 'This QR code does not match a valid event.' };
  }

  if (event.status === 'closed') {
    return {
      success: false,
      message: 'This event is closed.',
      eventTitle: event.title,
      eventCode: event.event_code,
    };
  }

  const now = Date.now();
  const start = event.start_time ? new Date(event.start_time).getTime() : null;
  const end = event.end_time ? new Date(event.end_time).getTime() : null;

  if (start !== null && Number.isFinite(start) && now < start) {
    return {
      success: false,
      message: 'Event has not started yet.',
      eventTitle: event.title,
      eventCode: event.event_code,
    };
  }

  if (end !== null && Number.isFinite(end) && now > end) {
    return {
      success: false,
      message: 'Event has already ended.',
      eventTitle: event.title,
      eventCode: event.event_code,
    };
  }

  const lateAfterMinutes = Number.isFinite(event.late_after_minutes)
    ? event.late_after_minutes
    : 15;

  const calculatedStatus: AttendanceStatus =
    start !== null &&
    Number.isFinite(start) &&
    now > start + lateAfterMinutes * 60 * 1000
      ? 'late'
      : 'present';

  const { data: attendanceRow, error: attendanceError } = await supabase
    .from('attendance')
    .insert({
      student_id: studentId,
      event_id: event.id,
      status: calculatedStatus,
    })
    .select('status, scanned_at')
    .single();

  if (attendanceError) {
    if (attendanceError.code === '23505') {
      return {
        success: false,
        message: 'Already registered for this event.',
        eventTitle: event.title,
        eventCode: event.event_code,
      };
    }

    return {
      success: false,
      message:
        attendanceError.code === '42501'
          ? 'Attendance is not allowed for this event.'
          : attendanceError.message,
      eventTitle: event.title,
      eventCode: event.event_code,
    };
  }

  studentHistoryCache.delete(studentId);
  if (event.created_by) teacherAttendanceCache.delete(event.created_by);

  const status =
    (attendanceRow?.status as AttendanceStatus | undefined) ?? calculatedStatus;

  return {
    success: true,
    message:
      status === 'late'
        ? 'Attendance recorded as Late.'
        : 'Attendance recorded as Present.',
    eventTitle: event.title,
    eventCode: event.event_code,
    attendanceStatus: status,
    recordedAt: attendanceRow?.scanned_at ?? new Date().toISOString(),
    lateAfterMinutes,
    studentNumber: profile.student_id,
  };
}

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, scanned_at, status, events ( event_code, title )')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (error || !data) {
    return studentHistoryCache.get(studentId) ?? [];
  }

  const rows = data.map((row: any) => ({
    id: row.id,
    eventId: row.events?.event_code ?? '',
    eventTitle: row.events?.title ?? '',
    scannedAt: row.scanned_at,
    status: (row.status ?? 'present') as AttendanceStatus,
  }));

  studentHistoryCache.set(studentId, rows);
  return rows;
}

export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, venue, status, start_time, end_time, late_after_minutes, created_by, created_at')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) {
    return teacherAttendanceCache.get(teacherId) ?? [];
  }

  const eventIds = events.map((event: any) => event.id);

  if (eventIds.length === 0) {
    teacherAttendanceCache.set(teacherId, []);
    return [];
  }

  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('id, student_id, scanned_at, status, event_id, profiles ( full_name, email, student_id )')
    .in('event_id', eventIds)
    .order('scanned_at', { ascending: false });

  if (attendanceError || !attendance) {
    return teacherAttendanceCache.get(teacherId) ?? [];
  }

  const result: TeacherEventAttendance[] = events.map((event: any) => {
    const rows = attendance.filter((row: any) => row.event_id === event.id);
    const attendees: EventAttendee[] = rows.map((row: any) => ({
      attendanceId: row.id,
      profileId: row.student_id,
      studentId: row.profiles?.student_id ?? null,
      studentName: row.profiles?.full_name ?? null,
      studentEmail: row.profiles?.email ?? null,
      scannedAt: row.scanned_at,
      status: (row.status ?? 'present') as AttendanceStatus,
    }));

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

  teacherAttendanceCache.set(teacherId, result);
  return result;
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
