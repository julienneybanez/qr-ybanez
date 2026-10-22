import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminAttendanceEditModal from '@/components/admin/AdminAttendanceEditModal';
import EventAttendanceCard from '@/components/attendance/EventAttendanceCard';
import EventAttendeesModal from '@/components/attendance/EventAttendeesModal';
import PageHeader from '@/components/PageHeader';
import { COLORS } from '@/constants/colors';
import {
  getAdminEventAttendance,
  type AdminAttendanceRecord,
  type AdminEventAttendanceGroup,
} from '@/lib/admin';
import type { EventAttendee } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { exportAttendanceCsv } from '@/lib/csv';
import { useCachedProfile } from '@/lib/profile-cache';
import { supabase } from '@/lib/supabase';

type EventFilter = 'all' | 'Ongoing' | 'Upcoming' | 'Ended' | 'Closed';

export default function AdminAttendanceScreen() {
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const { user } = useAuth();
  const { profile } = useCachedProfile(user?.id);
  const [groups, setGroups] = useState<AdminEventAttendanceGroup[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AdminAttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');

  const loadAttendance = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    const result = await getAdminEventAttendance();
    setGroups(result.data);
    setError(result.error);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => {
    if (profile?.role === 'admin') void loadAttendance();
  }, [profile?.role, loadAttendance]));

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const channel = supabase
      .channel('admin-attendance-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        void loadAttendance(true);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.role, loadAttendance]);

  useEffect(() => {
    if (eventId && groups.some((group) => group.eventId === eventId)) {
      setSelectedEventId(eventId);
    }
  }, [eventId, groups]);

  const selectedGroup = groups.find((group) => group.eventId === selectedEventId) ?? null;

  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return groups.filter((group) => {
      const matchesStatus = eventFilter === 'all' || group.displayStatus === eventFilter;
      const matchesSearch =
        !needle ||
        group.title.toLowerCase().includes(needle) ||
        group.eventCode.toLowerCase().includes(needle) ||
        group.venue?.toLowerCase().includes(needle) ||
        group.creatorName?.toLowerCase().includes(needle) ||
        group.creatorEmail?.toLowerCase().includes(needle) ||
        group.attendees.some((attendee) =>
          attendee.studentName?.toLowerCase().includes(needle) ||
          attendee.studentId?.toLowerCase().includes(needle)
        );

      return matchesStatus && matchesSearch;
    });
  }, [groups, query, eventFilter]);

  const exportGroup = async (group: AdminEventAttendanceGroup) => {
    const result = await exportAttendanceCsv(group);
    if (result.error) Alert.alert('Export failed', result.error);
  };

  const correctAttendee = (attendee: EventAttendee) => {
    if (!selectedGroup) return;

    setSelectedRecord({
      id: attendee.attendanceId,
      scannedAt: attendee.scannedAt,
      status: attendee.status,
      recordedVia: attendee.recordedVia,
      studentProfileId: attendee.profileId,
      studentName: attendee.studentName,
      studentEmail: attendee.studentEmail,
      schoolStudentId: attendee.studentId,
      eventId: selectedGroup.eventId,
      eventCode: selectedGroup.eventCode,
      eventTitle: selectedGroup.title,
    });
  };

  if (profile?.role !== 'admin') return <AccessDenied />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <PageHeader title="Attendance" />
      <View style={styles.container}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search event, creator, or student"
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

        {error ? (
          <Pressable onPress={() => void loadAttendance()} style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.danger} />
            <Text style={styles.errorText}>{error} Tap to retry.</Text>
          </Pressable>
        ) : null}

        {loading && groups.length === 0 ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.stateText}>Loading attendance...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredGroups}
            keyExtractor={(item) => item.eventId}
            renderItem={({ item }) => (
              <EventAttendanceCard
                item={item}
                creatorName={item.creatorName || item.creatorEmail}
                onPress={() => setSelectedEventId(item.eventId)}
                onExport={() => void exportGroup(item)}
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={() => void loadAttendance(true)}
            ListEmptyComponent={<EmptyState />}
          />
        )}
      </View>

      <EventAttendeesModal
        visible={!!selectedGroup}
        group={selectedGroup}
        editable
        onClose={() => setSelectedEventId(null)}
        onCorrect={correctAttendee}
        onExport={() => {
          if (selectedGroup) void exportGroup(selectedGroup);
        }}
        onUpdated={()=>void loadAttendance()}
      />

      <AdminAttendanceEditModal
        visible={!!selectedRecord}
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onSaved={() => void loadAttendance()}
      />
    </SafeAreaView>
  );
}

function AccessDenied() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <PageHeader title="Attendance" />
      <View style={styles.centerState}>
        <Ionicons name="shield-outline" size={34} color={COLORS.primary} />
        <Text style={styles.emptyTitle}>Admins only</Text>
        <Text style={styles.stateText}>This section is available only to Admin accounts.</Text>
      </View>
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={28} color={COLORS.primary} /></View>
      <Text style={styles.emptyTitle}>No events found</Text>
      <Text style={styles.stateText}>Create an event or change your search and filters.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea:{flex:1,backgroundColor:COLORS.navy},
  container:{flex:1,backgroundColor:COLORS.background,paddingHorizontal:16,paddingTop:14},
  searchBox:{minHeight:46,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,borderRadius:15,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border},
  searchInput:{flex:1,fontSize:12.5,color:COLORS.textPrimary},
  filters:{flexDirection:'row',gap:5,marginTop:9,marginBottom:11},
  filter:{flex:1,minHeight:33,borderRadius:999,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,alignItems:'center',justifyContent:'center'},
  filterActive:{backgroundColor:COLORS.primarySoft,borderColor:'#9DB0FF'},
  filterText:{fontSize:8.5,fontWeight:'700',color:COLORS.textSecondary},
  filterTextActive:{color:COLORS.primary},
  list:{paddingBottom:110},
  errorBanner:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:COLORS.dangerSoft,borderWidth:1,borderColor:'#FFE0E5',borderRadius:14,padding:11,marginBottom:10},
  errorText:{flex:1,color:COLORS.danger,fontSize:10.5,fontWeight:'600'},
  centerState:{flex:1,minHeight:320,alignItems:'center',justifyContent:'center',paddingHorizontal:28,backgroundColor:COLORS.background},
  emptyState:{minHeight:300,alignItems:'center',justifyContent:'center',paddingHorizontal:28},
  emptyIcon:{width:58,height:58,borderRadius:19,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.primarySoft,marginBottom:12},
  emptyTitle:{color:COLORS.textPrimary,fontSize:16,fontWeight:'800',marginTop:10,textAlign:'center'},
  stateText:{color:COLORS.textSecondary,fontSize:11.5,lineHeight:18,textAlign:'center',marginTop:5},
});
