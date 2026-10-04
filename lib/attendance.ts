import {
  getEventByCode,
} from './events';

import {
  getProfile,
} from './profiles';

import {
  parseQRPayload,
} from './qr';

import {
  supabase,
} from './supabase';

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;

  attendees: {
    profileId: string;
    studentId:
      | string
      | null;
    studentName:
      | string
      | null;
    scannedAt: string;
  }[];
};

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
};

const studentHistoryCache =
  new Map<
    string,
    AttendanceRecord[]
  >();

const teacherAttendanceCache =
  new Map<
    string,
    TeacherEventAttendance[]
  >();

export function peekAttendanceHistory(
  studentId: string
) {
  return (
    studentHistoryCache.get(
      studentId
    ) ?? null
  );
}

export function peekTeacherEventAttendance(
  teacherId: string
) {
  return (
    teacherAttendanceCache.get(
      teacherId
    ) ?? null
  );
}

export function clearAttendanceCaches() {
  studentHistoryCache.clear();

  teacherAttendanceCache.clear();
}

export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  const parsed =
    parseQRPayload(rawPayload);

  if (!parsed.ok) {
    return {
      success: false,
      message:
        parsed.message,
    };
  }

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (
    !user ||
    user.id !== studentId
  ) {
    return {
      success: false,
      message:
        'Please sign in again before scanning.',
    };
  }

  const profile =
    await getProfile(
      user.id
    );

  if (
    !profile ||
    profile.role !==
      'student'
  ) {
    return {
      success: false,

      message:
        'Only student accounts can record attendance.',
    };
  }

  if (
    !profile.student_id
  ) {
    return {
      success: false,

      message:
        'Your account does not have a Student ID. Please contact an administrator.',
    };
  }

  const event =
    await getEventByCode(
      parsed.payload.event
    );

  if (!event) {
    return {
      success: false,

      message:
        'This QR code does not match a valid event.',
    };
  }

  if (
    event.status ===
    'closed'
  ) {
    return {
      success: false,

      message:
        'This event is closed.',

      eventTitle:
        event.title,
    };
  }

  const now =
    Date.now();

  const start =
    event.start_time
      ? new Date(
          event.start_time
        ).getTime()
      : null;

  const end =
    event.end_time
      ? new Date(
          event.end_time
        ).getTime()
      : null;

  if (
    start !== null &&
    Number.isFinite(
      start
    ) &&
    now < start
  ) {
    return {
      success: false,

      message:
        'Event has not started yet.',

      eventTitle:
        event.title,
    };
  }

  if (
    end !== null &&
    Number.isFinite(end) &&
    now > end
  ) {
    return {
      success: false,

      message:
        'Event has already ended.',

      eventTitle:
        event.title,
    };
  }

  const {
    error: attendanceError,
  } = await supabase
    .from('attendance')
    .insert({
      student_id:
        studentId,

      event_id:
        event.id,
    });

  if (attendanceError) {
    if (
      attendanceError.code ===
      '23505'
    ) {
      return {
        success: false,

        message:
          'Already registered for this event.',

        eventTitle:
          event.title,
      };
    }

    return {
      success: false,

      message:
        attendanceError.code ===
        '42501'
          ? 'Attendance is not allowed for this event.'
          : attendanceError.message,

      eventTitle:
        event.title,
    };
  }

  studentHistoryCache.delete(
    studentId
  );

  if (event.created_by) {
    teacherAttendanceCache.delete(
      event.created_by
    );
  }

  return {
    success: true,

    message:
      'Attendance recorded!',

    eventTitle:
      event.title,
  };
}

export async function getAttendanceHistory(
  studentId: string
): Promise<
  AttendanceRecord[]
> {
  const { data, error } =
    await supabase
      .from('attendance')
      .select(
        'id, scanned_at, events ( event_code, title )'
      )
      .eq(
        'student_id',
        studentId
      )
      .order(
        'scanned_at',
        {
          ascending: false,
        }
      );

  if (
    error ||
    !data
  ) {
    return (
      studentHistoryCache.get(
        studentId
      ) ?? []
    );
  }

  const rows =
    data.map(
      (row: any) => ({
        id: row.id,

        eventId:
          row.events
            ?.event_code ??
          '',

        eventTitle:
          row.events
            ?.title ??
          '',

        scannedAt:
          row.scanned_at,
      })
    );

  studentHistoryCache.set(
    studentId,
    rows
  );

  return rows;
}

export async function getTeacherEventAttendance(
  teacherId: string
): Promise<
  TeacherEventAttendance[]
> {
  const {
    data: events,
    error: eventError,
  } = await supabase
    .from('events')
    .select(
      'id, event_code, title, start_time, end_time'
    )
    .eq(
      'created_by',
      teacherId
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (
    eventError ||
    !events
  ) {
    return (
      teacherAttendanceCache.get(
        teacherId
      ) ?? []
    );
  }

  const eventIds =
    events.map(
      (event: any) =>
        event.id
    );

  if (
    eventIds.length === 0
  ) {
    teacherAttendanceCache.set(
      teacherId,
      []
    );

    return [];
  }

  const {
    data: attendance,
    error:
      attendanceError,
  } = await supabase
    .from('attendance')
    .select(
      'student_id, scanned_at, event_id, profiles ( full_name, email, student_id )'
    )
    .in(
      'event_id',
      eventIds
    )
    .order(
      'scanned_at',
      {
        ascending: false,
      }
    );

  if (
    attendanceError ||
    !attendance
  ) {
    return (
      teacherAttendanceCache.get(
        teacherId
      ) ?? []
    );
  }

  const result =
    events.map(
      (event: any) => {
        const rows =
          attendance.filter(
            (
              attendanceRow: any
            ) =>
              attendanceRow.event_id ===
              event.id
          );

        return {
          eventId:
            event.id,

          eventCode:
            event.event_code,

          title:
            event.title,

          startTime:
            event.start_time,

          endTime:
            event.end_time,

          attendeeCount:
            rows.length,

          attendees:
            rows.map(
              (
                attendanceRow: any
              ) => ({
                profileId:
                  attendanceRow.student_id,

                studentId:
                  attendanceRow
                    .profiles
                    ?.student_id ??
                  null,

                studentName:
                  attendanceRow
                    .profiles
                    ?.full_name ??
                  null,

                scannedAt:
                  attendanceRow.scanned_at,
              })
            ),
        };
      }
    );

  teacherAttendanceCache.set(
    teacherId,
    result
  );

  return result;
}

export async function getTeacherEventSummary(
  teacherId: string
): Promise<
  TeacherEventSummary[]
> {
  const {
    data: events,
    error: eventError,
  } = await supabase
    .from('events')
    .select(
      'id, event_code, title'
    )
    .eq(
      'created_by',
      teacherId
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (
    eventError ||
    !events
  ) {
    return [];
  }

  const eventIds =
    events.map(
      (event: any) =>
        event.id
    );

  if (
    eventIds.length === 0
  ) {
    return [];
  }

  const {
    data: attendanceRows,
    error:
      attendanceError,
  } = await supabase
    .from('attendance')
    .select('event_id')
    .in(
      'event_id',
      eventIds
    );

  if (
    attendanceError ||
    !attendanceRows
  ) {
    return [];
  }

  const counts: Record<
    string,
    number
  > = {};

  attendanceRows.forEach(
    (row: any) => {
      counts[row.event_id] =
        (
          counts[
            row.event_id
          ] ?? 0
        ) + 1;
    }
  );

  return events.map(
    (event: any) => ({
      eventId:
        event.id,

      eventCode:
        event.event_code,

      title:
        event.title,

      attendeeCount:
        counts[
          event.id
        ] ?? 0,
    })
  );
}