import { clearAttendanceCaches, type AttendanceStatus } from './attendance';
import { clearEventCaches, type CloudEvent, type EventStatus } from './events';
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
  studentProfileId: string;
  studentName: string | null;
  studentEmail: string | null;
  schoolStudentId: string | null;
  eventId: string;
  eventCode: string;
  eventTitle: string;
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

  return {
    error: error?.message ?? null,
  };
}

export async function getAdminEvents(): Promise<AdminResult<AdminEventRecord[]>> {
  const [eventsResult, profilesResult, attendanceResult] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name, email'),
    supabase
      .from('attendance')
      .select('event_id'),
  ]);

  const error =
    eventsResult.error?.message ??
    profilesResult.error?.message ??
    attendanceResult.error?.message ??
    null;

  if (error) {
    return { data: [], error };
  }

  const creators = new Map(
    (profilesResult.data ?? []).map((profile: any) => [
      profile.id,
      {
        name: profile.full_name as string | null,
        email: profile.email as string | null,
      },
    ])
  );

  const attendanceCounts = new Map<string, number>();

  (attendanceResult.data ?? []).forEach((row: any) => {
    attendanceCounts.set(
      row.event_id,
      (attendanceCounts.get(row.event_id) ?? 0) + 1
    );
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
  const { data, error } = await supabase
    .from('attendance')
    .select(
      'id, student_id, event_id, scanned_at, status, profiles ( full_name, email, student_id ), events ( event_code, title )'
    )
    .order('scanned_at', { ascending: false });

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  return {
    data: (data ?? []).map((row: any) => ({
      id: row.id,
      scannedAt: row.scanned_at,
      status: (row.status ?? 'present') as AttendanceStatus,
      studentProfileId: row.student_id,
      studentName: row.profiles?.full_name ?? null,
      studentEmail: row.profiles?.email ?? null,
      schoolStudentId: row.profiles?.student_id ?? null,
      eventId: row.event_id,
      eventCode: row.events?.event_code ?? '',
      eventTitle: row.events?.title ?? 'Unknown event',
    })),
    error: null,
  };
}

export async function updateAdminAttendanceStatus(
  attendanceId: string,
  status: AttendanceStatus
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('attendance')
    .update({ status })
    .eq('id', attendanceId);

  if (!error) {
    clearAttendanceCaches();
  }

  return {
    error: error?.message ?? null,
  };
}

export async function deleteAdminAttendance(
  attendanceId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('id', attendanceId);

  if (!error) {
    clearAttendanceCaches();
  }

  return {
    error: error?.message ?? null,
  };
}

export async function setAdminEventStatus(
  eventId: string,
  status: EventStatus
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId);

  if (!error) {
    clearEventCaches();
  }

  return {
    error: error?.message ?? null,
  };
}
