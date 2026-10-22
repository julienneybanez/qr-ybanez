import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventAttendanceCard from '@/components/attendance/EventAttendanceCard';
import StudentCorrectionModal from '@/components/attendance/StudentCorrectionModal';
import EventAttendeesModal from '@/components/attendance/EventAttendeesModal';
import HistoryEmptyState from '@/components/history/HistoryEmptyState';
import StudentHistoryCard from '@/components/history/StudentHistoryCard';
import PageHeader from '@/components/PageHeader';
import { COLORS } from '@/constants/colors';
import {
  getAttendanceHistory,
  getTeacherEventAttendanceResult,
  peekAttendanceHistory,
  peekTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { exportAttendanceCsv } from '@/lib/csv';
import { useCachedProfile } from '@/lib/profile-cache';
import { supabase } from '@/lib/supabase';

type EventFilter = 'all' | 'Ongoing' | 'Upcoming' | 'Ended' | 'Closed';

export default function HistoryScreen() {
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const { user } = useAuth();
  const { profile } = useCachedProfile(user?.id);
  const initialStudentRecords = user ? peekAttendanceHistory(user.id) : null;
  const initialTeacherEvents = user ? peekTeacherEventAttendance(user.id) : null;
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>(() => initialStudentRecords ?? []);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>(() => initialTeacherEvents ?? []);
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => initialStudentRecords === null && initialTeacherEvents === null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestView,setRequestView]=useState<'new'|'mine'>('new');
  const [requestTarget, setRequestTarget] = useState<AttendanceRecord|null>(null);

  const refresh = useCallback(async () => {
    if (!user || !profile) return;

    if (profile.role === 'teacher') {
      const cached = peekTeacherEventAttendance(user.id);
      if (cached) {
        setTeacherEvents(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }

      const result = await getTeacherEventAttendanceResult(user.id);
      setTeacherEvents(result.data);
      setTeacherError(result.error);
      setStudentRecords([]);
      setLoading(false);
      return;
    }

    setTeacherError(null);
    const cached = peekAttendanceHistory(user.id);
    if (cached) {
      setStudentRecords(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const records = await getAttendanceHistory(user.id);
    setStudentRecords(records);
    setTeacherEvents([]);
    setLoading(false);
  }, [user?.id, profile?.role]);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  useEffect(() => {
    if (!user || !profile || profile.role === 'admin') return;

    const channel = supabase
      .channel('attendance-history-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.role, refresh]);

  useEffect(() => {
    if (profile?.role === 'teacher' && eventId && teacherEvents.some((event) => event.eventId === eventId)) {
      setSelectedEventId(eventId);
    }
  }, [eventId, profile?.role, teacherEvents]);

  const isTeacher = profile?.role === 'teacher';
  const selectedGroup = teacherEvents.find((event) => event.eventId === selectedEventId) ?? null;

  const filteredTeacherEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return teacherEvents.filter((event) => {
      const matchesStatus = eventFilter === 'all' || event.displayStatus === eventFilter;
      const matchesSearch =
        !needle ||
        event.title.toLowerCase().includes(needle) ||
        event.eventCode.toLowerCase().includes(needle) ||
        event.venue?.toLowerCase().includes(needle) ||
        event.attendees.some((attendee) =>
          attendee.studentName?.toLowerCase().includes(needle) ||
          attendee.studentId?.toLowerCase().includes(needle)
        );

      return matchesStatus && matchesSearch;
    });
  }, [teacherEvents, query, eventFilter]);

  const exportGroup = async (group: TeacherEventAttendance) => {
    const result = await exportAttendanceCsv(group);
    if (result.error) Alert.alert('Export failed', result.error);
  };

  const hasVisibleData = isTeacher ? teacherEvents.length > 0 : studentRecords.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <PageHeader title={isTeacher ? 'Attendance' : 'Attendance History'} />

      <View style={styles.container}>
        {loading && !hasVisibleData ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.stateText}>Loading records...</Text>
          </View>
        ) : isTeacher ? (
          <>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search event or attendee"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.searchInput}
              />
            </View>

            <View style={styles.filters}>
              {(['all', 'Ongoing', 'Upcoming', 'Ended', 'Closed'] as EventFilter[]).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setEventFilter(value)}
                  style={[styles.filter, eventFilter === value && styles.filterActive]}
                >
                  <Text style={[styles.filterText, eventFilter === value && styles.filterTextActive]}>
                    {value === 'all' ? 'All' : value}
                  </Text>
                </Pressable>
              ))}
            </View>

            {teacherError ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void refresh()}
                style={styles.errorBanner}
              >
                <Ionicons name="alert-circle-outline" size={19} color={COLORS.danger} />
                <Text style={styles.errorText}>{teacherError} Tap to retry.</Text>
              </Pressable>
            ) : null}

            {filteredTeacherEvents.length === 0 ? (
              <HistoryEmptyState
                icon={teacherError ? 'alert-circle-outline' : 'calendar-outline'}
                title={teacherError && teacherEvents.length === 0
                  ? 'Could not load events'
                  : teacherEvents.length === 0 ? 'No events yet' : 'No matching events'}
                message={teacherError && teacherEvents.length === 0
                  ? 'Check the error above and retry.'
                  : teacherEvents.length === 0
                    ? 'Your events will appear here, including closed events.'
                    : 'Try another search or status filter.'}
              />
            ) : (
              <FlatList
                data={filteredTeacherEvents}
                keyExtractor={(item) => item.eventId}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                  <EventAttendanceCard
                    item={item}
                    onPress={() => setSelectedEventId(item.eventId)}
                    onExport={() => void exportGroup(item)}
                  />
                )}
              />
            )}
          </>
        ) : (<>
          <View style={styles.studentActions}>
            <Pressable onPress={() => {setRequestTarget(null);setRequestView('new');setRequestOpen(true);}} style={styles.requestAction}><Ionicons name="flag-outline" size={15} color={COLORS.primary}/><Text style={styles.requestText}>Missing Attendance</Text></Pressable>
            <Pressable onPress={() => {setRequestTarget(null);setRequestView('mine');setRequestOpen(true);}} style={styles.requestAction}><Ionicons name="document-text-outline" size={15} color={COLORS.primary}/><Text style={styles.requestText}>My Requests</Text></Pressable>
          </View>
          {studentRecords.length === 0 ? (
          <HistoryEmptyState
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
            renderItem={({ item }) => <StudentHistoryCard item={item} onReport={() => {setRequestTarget(item);setRequestView('new');setRequestOpen(true);}} />}
          />
        )}</>)}
      </View>

      <StudentCorrectionModal visible={requestOpen} studentId={user?.id??''} initialEventId={requestTarget?.eventUuid} initialStatus={requestTarget?.status} initialView={requestView} onClose={()=>setRequestOpen(false)} onSubmitted={()=>void refresh()}/>

      <EventAttendeesModal
        visible={!!selectedGroup}
        group={selectedGroup}
        onClose={() => setSelectedEventId(null)}
        onExport={() => {
          if (selectedGroup) void exportGroup(selectedGroup);
        }}
        onUpdated={()=>void refresh()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:{flex:1,backgroundColor:COLORS.navy},
  container:{flex:1,backgroundColor:COLORS.background,paddingHorizontal:16,paddingTop:14},
  list:{paddingBottom:104},
  errorBanner:{
    flexDirection:'row',alignItems:'center',gap:9,
    marginBottom:10,padding:12,borderRadius:14,
    borderWidth:1,borderColor:'#F4CED4',backgroundColor:COLORS.dangerSoft,
  },
  errorText:{flex:1,fontSize:11,lineHeight:16,color:COLORS.danger,fontWeight:'600'},
  studentActions:{flexDirection:'row',gap:8,marginBottom:12},
  requestAction:{flex:1,minHeight:42,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:6,borderRadius:13,backgroundColor:COLORS.primarySoft},
  requestText:{fontSize:10.5,fontWeight:'800',color:COLORS.primary},
  searchBox:{minHeight:46,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,borderRadius:15,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border},
  searchInput:{flex:1,fontSize:12.5,color:COLORS.textPrimary},
  filters:{flexDirection:'row',gap:5,marginTop:9,marginBottom:11},
  filter:{flex:1,minHeight:33,borderRadius:999,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,alignItems:'center',justifyContent:'center'},
  filterActive:{backgroundColor:COLORS.primarySoft,borderColor:'#9DB0FF'},
  filterText:{fontSize:8.5,fontWeight:'700',color:COLORS.textSecondary},
  filterTextActive:{color:COLORS.primary},
  centerState:{flex:1,minHeight:300,alignItems:'center',justifyContent:'center',paddingHorizontal:24},
  stateText:{fontSize:13,lineHeight:19,color:COLORS.textSecondary,textAlign:'center',marginTop:10},
});
