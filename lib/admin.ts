import {
  clearAttendanceCaches,
  type AttendanceStatus,
  type EventAttendanceGroup,
  type EventAttendee,
} from './attendance';
import { clearEventCaches, getEventDisplayStatus, type CloudEvent, type EventStatus } from './events';
import type { Role } from './profiles';
import { supabase } from './supabase';

export type AdminDashboardStats = {
  totalUsers: number;
  students: number;
  teachers: number;
  admins: number;
  totalEvents: number;
  openEvents: number;
  closedEvents: number;
  attendanceRecords: number;
  presentAttendance: number;
  lateAttendance: number;
  excusedAttendance: number;
};

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  student_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminEventRecord = CloudEvent & {
  creatorName: string | null;
  creatorEmail: string | null;
  attendeeCount: number;
};

export type AdminAttendanceRecord = {
  id: string;
  scannedAt: string;
  status: AttendanceStatus;
  recordedVia: 'qr'|'manual'|'correction';
  studentProfileId: string;
  studentName: string | null;
  studentEmail: string | null;
  schoolStudentId: string | null;
  eventId: string;
  eventCode: string;
  eventTitle: string;
};

export type AdminEventAttendanceGroup = EventAttendanceGroup & {
  creatorName: string | null;
  creatorEmail: string | null;
};

type AdminResult<T> = {
  data: T;
  error: string | null;
};

export async function getAdminDashboardStats(): Promise<AdminResult<AdminDashboardStats>> {
  const [profilesResult, eventsResult, attendanceResult] = await Promise.all([
    supabase.from('profiles').select('role'),
    supabase.from('events').select('status'),
    supabase.from('attendance').select('id, status'),
  ]);

  const error =
    profilesResult.error?.message ??
    eventsResult.error?.message ??
    attendanceResult.error?.message ??
    null;

  const profiles = (profilesResult.data ?? []) as { role: Role }[];
  const events = (eventsResult.data ?? []) as { status: EventStatus }[];
  const attendance = (attendanceResult.data ?? []) as { id: string; status: AttendanceStatus }[];

  return {
    data: {
      totalUsers: profiles.length,
      students: profiles.filter((profile) => profile.role === 'student').length,
      teachers: profiles.filter((profile) => profile.role === 'teacher').length,
      admins: profiles.filter((profile) => profile.role === 'admin').length,
      totalEvents: events.length,
      openEvents: events.filter((event) => event.status === 'open').length,
      closedEvents: events.filter((event) => event.status === 'closed').length,
      attendanceRecords: attendance.length,
      presentAttendance: attendance.filter((record) => record.status === 'present').length,
      lateAttendance: attendance.filter((record) => record.status === 'late').length,
      excusedAttendance: attendance.filter((record) => record.status === 'excused').length,
    },
    error,
  };
}

export async function getAdminUsers(): Promise<AdminResult<AdminUser[]>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, student_id, created_at, updated_at')
    .order('created_at', { ascending: false });

  return {
    data: (data ?? []) as AdminUser[],
    error: error?.message ?? null,
  };
}

export async function updateAdminUserProfile(
  userId: string,
  updates: {
    fullName: string;
    role: Role;
    studentId: string | null;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: updates.fullName,
      role: updates.role,
      student_id: updates.role === 'student' ? updates.studentId : null,
    })
    .eq('id', userId);

  return { error: error?.message ?? null };
}

export async function getAdminEvents(): Promise<AdminResult<AdminEventRecord[]>> {
  const [eventsResult, profilesResult, attendanceResult] = await Promise.all([
    supabase.from('events').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, email'),
    supabase.from('attendance').select('event_id'),
  ]);

  const error =
    eventsResult.error?.message ??
    profilesResult.error?.message ??
    attendanceResult.error?.message ??
    null;

  // Event records remain usable even if optional creator/count details fail.
  if (eventsResult.error || !eventsResult.data) return { data: [], error };

  const creators = new Map(
    (profilesResult.data ?? []).map((profile: any) => [
      profile.id,
      { name: profile.full_name as string | null, email: profile.email as string | null },
    ])
  );

  const attendanceCounts = new Map<string, number>();

  (attendanceResult.data ?? []).forEach((row: any) => {
    attendanceCounts.set(row.event_id, (attendanceCounts.get(row.event_id) ?? 0) + 1);
  });

  return {
    data: ((eventsResult.data ?? []) as CloudEvent[]).map((event) => {
      const creator = event.created_by ? creators.get(event.created_by) : null;

      return {
        ...event,
        late_after_minutes: event.late_after_minutes ?? 15,
        creatorName: creator?.name ?? null,
        creatorEmail: creator?.email ?? null,
        attendeeCount: attendanceCounts.get(event.id) ?? 0,
      };
    }),
    error: null,
  };
}

export async function getAdminAttendance(): Promise<AdminResult<AdminAttendanceRecord[]>> {
  // Join attendance.student_id to profiles.id ourselves. The recorded_by
  // relationship points to the staff member who recorded a manual check-in.
  const { data, error } = await supabase
    .from('attendance')
    .select('id, student_id, event_id, scanned_at, status, recorded_via')
    .order('scanned_at', { ascending: false });

  if (error) return { data: [], error: error.message };

  const records = data ?? [];
  const studentIds = [...new Set(records.map((row) => row.student_id))];
  const eventIds = [...new Set(records.map((row) => row.event_id))];

  const [profilesResult, eventsResult] = await Promise.all([
    studentIds.length
      ? supabase
          .from('profiles')
          .select('id, full_name, email, student_id')
          .in('id', studentIds)
      : Promise.resolve({ data: [], error: null }),
    eventIds.length
      ? supabase
          .from('events')
          .select('id, event_code, title')
          .in('id', eventIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const profilesById = new Map<string, {
    full_name: string | null;
    email: string | null;
    student_id: string | null;
  }>();
  for (const profile of profilesResult.data ?? []) {
    profilesById.set(profile.id, profile);
  }

  const eventsById = new Map<string, {
    event_code: string;
    title: string;
  }>();
  for (const event of eventsResult.data ?? []) {
    eventsById.set(event.id, event);
  }

  return {
    data: records.map((row) => {
      const student = profilesById.get(row.student_id);
      const event = eventsById.get(row.event_id);
      return {
        id: row.id,
        scannedAt: row.scanned_at,
        status: (row.status ?? 'present') as AttendanceStatus,
        recordedVia: (row.recorded_via ?? 'qr') as 'qr' | 'manual' | 'correction',
        studentProfileId: row.student_id,
        studentName: student?.full_name ?? null,
        studentEmail: student?.email ?? null,
        schoolStudentId: student?.student_id ?? null,
        eventId: row.event_id,
        eventCode: event?.event_code ?? '',
        eventTitle: event?.title ?? 'Unknown event',
      };
    }),
    error: profilesResult.error?.message ?? eventsResult.error?.message ?? null,
  };
}

export async function getAdminEventAttendance(): Promise<AdminResult<AdminEventAttendanceGroup[]>> {
  const [eventsResult, attendanceResult] = await Promise.all([
    getAdminEvents(),
    getAdminAttendance(),
  ]);

  const error = eventsResult.error ?? attendanceResult.error;
  if (eventsResult.error && eventsResult.data.length === 0) {
    return { data: [], error };
  }

  // If attendee details cannot load, still show every event and the error.
  return {
    data: eventsResult.data.map((event) => {
      const records = attendanceResult.data.filter((record) => record.eventId === event.id);
      const attendees: EventAttendee[] = records.map((record) => ({
        attendanceId: record.id,
        profileId: record.studentProfileId,
        studentId: record.schoolStudentId,
        studentName: record.studentName,
        studentEmail: record.studentEmail,
        scannedAt: record.scannedAt,
        status: record.status,
        recordedVia: record.recordedVia,
      }));

      const timestamps = attendees
        .map((attendee) => new Date(attendee.scannedAt).getTime())
        .filter(Number.isFinite);

      return {
        eventId: event.id,
        eventCode: event.event_code,
        title: event.title,
        venue: event.venue,
        startTime: event.start_time,
        endTime: event.end_time,
        eventStatus: event.status,
        displayStatus: getEventDisplayStatus(event),
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
        creatorName: event.creatorName,
        creatorEmail: event.creatorEmail,
      };
    }),
    error: null,
  };
}

export async function updateAdminAttendanceStatus(
  attendanceId: string,
  status: AttendanceStatus,
  reason: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('correct_attendance_record', {
    p_attendance_id: attendanceId,
    p_status: status,
    p_reason: reason.trim(),
  });
  if (!error) clearAttendanceCaches();
  return { error: error?.message ?? null };
}

export async function deleteAdminAttendance(
  attendanceId: string,
  reason: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('remove_attendance_record', {
    p_attendance_id: attendanceId,
    p_reason: reason.trim(),
  });
  if (!error) clearAttendanceCaches();
  return { error: error?.message ?? null };
}

export async function setAdminEventStatus(
  eventId: string,
  status: EventStatus
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId);

  if (!error) clearEventCaches();
  return { error: error?.message ?? null };
}
