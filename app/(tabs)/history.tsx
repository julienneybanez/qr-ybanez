import { useFocusEffect } from 'expo-router';
import {
  useCallback,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import HistoryEmptyState from '@/components/history/HistoryEmptyState';
import StudentHistoryCard from '@/components/history/StudentHistoryCard';
import TeacherAttendanceCard from '@/components/history/TeacherAttendanceCard';
import { COLORS } from '@/constants/colors';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  peekAttendanceHistory,
  peekTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { useCachedProfile } from '@/lib/profile-cache';

export default function HistoryScreen() {
  const { user } = useAuth();

  const { profile } =
    useCachedProfile(user?.id);

  const initialStudentRecords = user
    ? peekAttendanceHistory(user.id)
    : null;

  const initialTeacherEvents = user
    ? peekTeacherEventAttendance(user.id)
    : null;

  const [
    studentRecords,
    setStudentRecords,
  ] = useState<AttendanceRecord[]>(
    () => initialStudentRecords ?? []
  );

  const [
    teacherEvents,
    setTeacherEvents,
  ] = useState<TeacherEventAttendance[]>(
    () => initialTeacherEvents ?? []
  );

  const [loading, setLoading] =
    useState(
      () =>
        initialStudentRecords === null &&
        initialTeacherEvents === null
    );

  const refresh = useCallback(
    async () => {
      if (!user || !profile) {
        return;
      }

      if (profile.role === 'teacher') {
        const cached =
          peekTeacherEventAttendance(
            user.id
          );

        if (cached) {
          setTeacherEvents(cached);
          setLoading(false);
        } else {
          setLoading(true);
        }

        const events =
          await getTeacherEventAttendance(
            user.id
          );

        setTeacherEvents(events);
        setStudentRecords([]);
        setLoading(false);
        return;
      }

      const cached =
        peekAttendanceHistory(user.id);

      if (cached) {
        setStudentRecords(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }

      const records =
        await getAttendanceHistory(
          user.id
        );

      setStudentRecords(records);
      setTeacherEvents([]);
      setLoading(false);
    },
    [user, profile]
  );

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const isTeacher =
    profile?.role === 'teacher';

  const hasVisibleData = isTeacher
    ? teacherEvents.length > 0
    : studentRecords.length > 0;

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <View style={styles.container}>
        <View style={styles.pageHeader}>
          <Text style={styles.title}>
            Attendance History
          </Text>

          <Text style={styles.subtitle}>
            {isTeacher
              ? 'Review attendance from your events.'
              : 'Your recorded school event attendance.'}
          </Text>
        </View>

        {loading && !hasVisibleData ? (
          <View style={styles.centerState}>
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
            />

            <Text style={styles.stateText}>
              Loading records...
            </Text>
          </View>
        ) : isTeacher ? (
          teacherEvents.length === 0 ? (
            <HistoryEmptyState
              icon="calendar-outline"
              title="No events yet"
              message="Create an event first and attendance records will appear here."
            />
          ) : (
            <FlatList
              data={teacherEvents}
              keyExtractor={(item) =>
                item.eventId
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <TeacherAttendanceCard
                  item={item}
                />
              )}
            />
          )
        ) : studentRecords.length === 0 ? (
          <HistoryEmptyState
            icon="time-outline"
            title="No attendance yet"
            message="Scan an event QR code and your attendance history will appear here."
          />
        ) : (
          <FlatList
            data={studentRecords}
            keyExtractor={(item) =>
              String(item.id)
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <StudentHistoryCard
                item={item}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
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
  centerState: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stateText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
});
