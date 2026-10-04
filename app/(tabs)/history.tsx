import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/colors';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';

export default function HistoryScreen() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] =
    useState<TeacherEventAttendance[]>([]);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const profile = await getProfile(user.id);
    const currentRole = profile?.role ?? 'student';
    setRole(currentRole);

    if (currentRole === 'teacher') {
      const events = await getTeacherEventAttendance(user.id);
      setTeacherEvents(events);
      setStudentRecords([]);
    } else {
      const records = await getAttendanceHistory(user.id);
      setStudentRecords(records);
      setTeacherEvents([]);
    }

    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.pageHeader}>
          <Text style={styles.title}>
            Attendance History
          </Text>

          <Text style={styles.subtitle}>
            {role === 'teacher'
              ? 'Review attendance from your events.'
              : 'Your recorded school event attendance.'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
            />

            <Text style={styles.stateText}>
              Loading records...
            </Text>
          </View>
        ) : role === 'teacher' ? (
          teacherEvents.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No events yet"
              message="Create an event first and attendance records will appear here."
            />
          ) : (
            <FlatList
              data={teacherEvents}
              keyExtractor={(item) => item.eventId}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <TeacherEventCard item={item} />
              )}
            />
          )
        ) : studentRecords.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title="No attendance yet"
            message="Scan an event QR code and your attendance history will appear here."
          />
        ) : (
          <FlatList
            data={studentRecords}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <StudentRecordCard item={item} />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function StudentRecordCard({
  item,
}: {
  item: AttendanceRecord;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.eventIcon}>
          <Ionicons
            name="checkmark-circle-outline"
            size={22}
            color={COLORS.success}
          />
        </View>

        <View style={styles.cardHeaderText}>
          <Text style={styles.eventTitle}>
            {item.eventTitle}
          </Text>

          <Text style={styles.eventCode}>
            {item.eventId}
          </Text>
        </View>

        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>
            Recorded
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons
          name="time-outline"
          size={16}
          color={COLORS.textSecondary}
        />

        <Text style={styles.metaText}>
          {formatDate(item.scannedAt)}
        </Text>
      </View>
    </View>
  );
}

function TeacherEventCard({
  item,
}: {
  item: TeacherEventAttendance;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.eventIcon}>
          <Ionicons
            name="calendar-outline"
            size={21}
            color={COLORS.primary}
          />
        </View>

        <View style={styles.cardHeaderText}>
          <Text style={styles.eventTitle}>
            {item.title}
          </Text>

          <Text style={styles.eventCode}>
            {item.eventCode}
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countNumber}>
            {item.attendeeCount}
          </Text>

          <Text style={styles.countLabel}>
            attendees
          </Text>
        </View>
      </View>

      {item.startTime ? (
        <View style={styles.metaRow}>
          <Ionicons
            name="time-outline"
            size={16}
            color={COLORS.textSecondary}
          />

          <Text style={styles.metaText}>
            {formatDate(item.startTime)}
          </Text>
        </View>
      ) : null}

      {item.attendees.length === 0 ? (
        <Text style={styles.attendeeEmpty}>
          No attendees yet.
        </Text>
      ) : (
        <View style={styles.attendeeList}>
          {item.attendees.map((attendee) => (
            <View
              key={attendee.studentId}
              style={styles.attendeeRow}
            >
              <View style={styles.attendeeAvatar}>
                <Text style={styles.attendeeAvatarText}>
                  {(attendee.studentName?.trim()?.[0] ?? '?').toUpperCase()}
                </Text>
              </View>

              <View style={styles.attendeeInfo}>
                <Text style={styles.attendeeName}>
                  {attendee.studentName ||
                    shortId(attendee.studentId)}
                </Text>

                <Text style={styles.metaText}>
                  {formatDate(attendee.scannedAt)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function EmptyState({
  icon,
  title,
  message,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}) {
  return (
    <View style={styles.centerState}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={icon}
          size={30}
          color={COLORS.primary}
        />
      </View>

      <Text style={styles.emptyTitle}>
        {title}
      </Text>

      <Text style={styles.stateText}>
        {message}
      </Text>
    </View>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function shortId(id: string) {
  return id ? `…${id.slice(-8)}` : 'Unknown';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  pageHeader: {
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  eventCode: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    backgroundColor: COLORS.successSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginLeft: 8,
  },
  statusBadgeText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '700',
  },
  countBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  countNumber: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  countLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    gap: 7,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  attendeeList: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  attendeeAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  attendeeAvatarText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  attendeeEmpty: {
    marginTop: 14,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  centerState: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  stateText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
});
