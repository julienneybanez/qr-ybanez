import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { COLORS } from '@/constants/colors';
import { getAdminAttendance, type AdminAttendanceRecord } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { useCachedProfile } from '@/lib/profile-cache';

export default function AdminAttendanceScreen() {
  const { user } = useAuth();
  const { profile } = useCachedProfile(user?.id);
  const [records, setRecords] = useState<AdminAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadAttendance = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    const result = await getAdminAttendance();
    setRecords(result.data);
    setError(result.error);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (profile?.role === 'admin') void loadAttendance();
    }, [profile?.role, loadAttendance])
  );

  const filteredRecords = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return records;

    return records.filter((record) =>
      record.studentName?.toLowerCase().includes(needle) ||
      record.studentEmail?.toLowerCase().includes(needle) ||
      record.schoolStudentId?.toLowerCase().includes(needle) ||
      record.eventTitle.toLowerCase().includes(needle) ||
      record.eventCode.toLowerCase().includes(needle)
    );
  }, [records, query]);

  if (profile?.role !== 'admin') {
    return <AccessDenied />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <PageHeader title="Attendance" subtitle="Review attendance scans recorded across all events." />
      <View style={styles.container}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={19} color={COLORS.textSecondary} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search student, ID, event, or code" placeholderTextColor={COLORS.textSecondary} style={styles.searchInput} autoCapitalize="none" />
        </View>

        {error ? (
          <Pressable onPress={() => void loadAttendance()} style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.danger} />
            <Text style={styles.errorText}>{error} Tap to retry.</Text>
          </Pressable>
        ) : null}

        {loading && records.length === 0 ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.stateText}>Loading attendance...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredRecords}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <AttendanceCard item={item} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={() => void loadAttendance(true)}
            ListEmptyComponent={<EmptyState />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function AttendanceCard({ item }: { item: AdminAttendanceRecord }) {
  const recordedAt = new Date(item.scannedAt).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.checkIcon}><Ionicons name="checkmark" size={21} color={COLORS.success} /></View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.eventTitle}>{item.eventTitle}</Text>
          <Text style={styles.eventCode}>{item.eventCode}</Text>
        </View>
        <View style={styles.recordedBadge}><Text style={styles.recordedText}>Recorded</Text></View>
      </View>

      <View style={styles.studentBlock}>
        <Text style={styles.studentName}>{item.studentName || 'Unnamed student'}</Text>
        <Text style={styles.studentEmail}>{item.studentEmail || 'No email'}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="card-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>Student ID: {item.schoolStudentId || 'Not assigned'}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{recordedAt}</Text>
        </View>
      </View>
    </View>
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
      <View style={styles.emptyIcon}><Ionicons name="checkmark-done-outline" size={28} color={COLORS.primary} /></View>
      <Text style={styles.emptyTitle}>No attendance records</Text>
      <Text style={styles.stateText}>Student attendance scans will appear here once they are recorded.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.navy },
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 16, paddingTop: 14 },
  searchBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },
  list: { paddingBottom: 110 },
  card: { backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.successSoft },
  cardTitleWrap: { flex: 1 },
  eventTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  eventCode: { color: COLORS.textSecondary, fontSize: 9.5, marginTop: 3, fontWeight: '600' },
  recordedBadge: { borderRadius: 999, backgroundColor: COLORS.successSoft, paddingHorizontal: 8, paddingVertical: 5 },
  recordedText: { color: COLORS.success, fontSize: 8.5, fontWeight: '800' },
  studentBlock: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  studentName: { color: COLORS.textPrimary, fontSize: 12.5, fontWeight: '800' },
  studentEmail: { color: COLORS.textSecondary, fontSize: 10, marginTop: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  metaText: { flex: 1, color: COLORS.textSecondary, fontSize: 10.5 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.dangerSoft, borderWidth: 1, borderColor: '#FFE0E5', borderRadius: 14, padding: 11, marginBottom: 10 },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 10.5, fontWeight: '600' },
  centerState: { flex: 1, minHeight: 320, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, backgroundColor: COLORS.background },
  emptyState: { minHeight: 300, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  emptyIcon: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primarySoft, marginBottom: 12 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  stateText: { color: COLORS.textSecondary, fontSize: 11.5, lineHeight: 18, textAlign: 'center', marginTop: 5 },
});
