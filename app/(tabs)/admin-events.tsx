import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { COLORS } from '@/constants/colors';
import { getAdminEvents, setAdminEventStatus, type AdminEventRecord } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { getEventDisplayStatus } from '@/lib/events';
import { useCachedProfile } from '@/lib/profile-cache';

export default function AdminEventsScreen() {
  const { user } = useAuth();
  const { profile } = useCachedProfile(user?.id);
  const [events, setEvents] = useState<AdminEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadEvents = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    const result = await getAdminEvents();
    setEvents(result.data);
    setError(result.error);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (profile?.role === 'admin') void loadEvents();
    }, [profile?.role, loadEvents])
  );

  const filteredEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return events;

    return events.filter((event) =>
      event.title.toLowerCase().includes(needle) ||
      event.event_code.toLowerCase().includes(needle) ||
      event.venue?.toLowerCase().includes(needle) ||
      event.creatorName?.toLowerCase().includes(needle) ||
      event.creatorEmail?.toLowerCase().includes(needle)
    );
  }, [events, query]);

  const closeEvent = (event: AdminEventRecord) => {
    Alert.alert(
      'Close event?',
      event.title + ' will stop accepting attendance scans.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Event',
          style: 'destructive',
          onPress: async () => {
            setUpdatingId(event.id);
            const result = await setAdminEventStatus(event.id, 'closed');
            setUpdatingId(null);

            if (result.error) {
              Alert.alert('Error', result.error);
              return;
            }

            await loadEvents();
          },
        },
      ]
    );
  };

  if (profile?.role !== 'admin') {
    return <AccessDenied />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <PageHeader title="Event Oversight" subtitle="Monitor events created by teachers across QR-ATT." />
      <View style={styles.container}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={19} color={COLORS.textSecondary} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search event, code, venue, or teacher" placeholderTextColor={COLORS.textSecondary} style={styles.searchInput} autoCapitalize="none" />
        </View>

        {error ? (
          <Pressable onPress={() => void loadEvents()} style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.danger} />
            <Text style={styles.errorText}>{error} Tap to retry.</Text>
          </Pressable>
        ) : null}

        {loading && events.length === 0 ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.stateText}>Loading events...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredEvents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <EventCard item={item} updating={updatingId === item.id} onClose={() => closeEvent(item)} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={() => void loadEvents(true)}
            ListEmptyComponent={<EmptyState />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function EventCard({ item, updating, onClose }: { item: AdminEventRecord; updating: boolean; onClose: () => void }) {
  const displayStatus = getEventDisplayStatus(item);
  const canClose = item.status === 'open';
  const dateText = item.start_time
    ? new Date(item.start_time).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'No schedule';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.eventIcon}><Ionicons name="calendar-outline" size={21} color={COLORS.primary} /></View>
        <View style={styles.titleWrap}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventCode}>{item.event_code}</Text>
        </View>
        <View style={[styles.statusBadge, displayStatus === 'Closed' && styles.statusClosed]}>
          <Text style={[styles.statusText, displayStatus === 'Closed' && styles.statusClosedText]}>{displayStatus}</Text>
        </View>
      </View>

      <View style={styles.infoRow}><Ionicons name="person-outline" size={15} color={COLORS.textSecondary} /><Text style={styles.infoText}>{item.creatorName || item.creatorEmail || 'Unknown teacher'}</Text></View>
      <View style={styles.infoRow}><Ionicons name="time-outline" size={15} color={COLORS.textSecondary} /><Text style={styles.infoText}>{dateText}</Text></View>
      <View style={styles.infoRow}><Ionicons name="location-outline" size={15} color={COLORS.textSecondary} /><Text style={styles.infoText}>{item.venue || 'No venue'}</Text></View>

      <View style={styles.footer}>
        <View style={styles.attendancePill}><Ionicons name="people-outline" size={14} color={COLORS.primary} /><Text style={styles.attendanceText}>{item.attendeeCount} attendee{item.attendeeCount === 1 ? '' : 's'}</Text></View>
        {canClose ? (
          <Pressable disabled={updating} onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed, updating && styles.disabled]}>
            {updating ? <ActivityIndicator size="small" color={COLORS.danger} /> : <><Ionicons name="close-circle-outline" size={16} color={COLORS.danger} /><Text style={styles.closeText}>Close</Text></>}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function AccessDenied() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <PageHeader title="Event Oversight" />
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
      <Text style={styles.stateText}>Events created by teachers will appear here.</Text>
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
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  eventIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primarySoft },
  titleWrap: { flex: 1 },
  eventTitle: { color: COLORS.textPrimary, fontSize: 13.5, fontWeight: '800' },
  eventCode: { color: COLORS.textSecondary, fontSize: 9.5, marginTop: 3, fontWeight: '600' },
  statusBadge: { borderRadius: 999, backgroundColor: COLORS.successSoft, paddingHorizontal: 8, paddingVertical: 5 },
  statusClosed: { backgroundColor: COLORS.surfaceStrong },
  statusText: { color: COLORS.success, fontSize: 9, fontWeight: '800' },
  statusClosedText: { color: COLORS.textSecondary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7 },
  infoText: { flex: 1, color: COLORS.textSecondary, fontSize: 10.5 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  attendancePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: COLORS.primarySoft, paddingHorizontal: 9, paddingVertical: 6 },
  attendanceText: { color: COLORS.primary, fontSize: 9.5, fontWeight: '800' },
  closeButton: { minWidth: 78, minHeight: 34, borderRadius: 11, paddingHorizontal: 10, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.dangerSoft },
  closeText: { color: COLORS.danger, fontSize: 10, fontWeight: '800' },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.dangerSoft, borderWidth: 1, borderColor: '#FFE0E5', borderRadius: 14, padding: 11, marginBottom: 10 },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 10.5, fontWeight: '600' },
  centerState: { flex: 1, minHeight: 320, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, backgroundColor: COLORS.background },
  emptyState: { minHeight: 300, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  emptyIcon: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primarySoft, marginBottom: 12 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  stateText: { color: COLORS.textSecondary, fontSize: 11.5, lineHeight: 18, textAlign: 'center', marginTop: 5 },
});
