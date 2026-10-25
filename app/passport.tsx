import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StampCard from '@/components/passport/StampCard';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getMyPassport, type PassportData, type PassportStamp } from '@/lib/passport';
import { useCachedProfile } from '@/lib/profile-cache';

const EMPTY: PassportData = { signature: [], regular: [], earnedCount: 0 };

export default function PassportScreen() {
  const { user } = useAuth();
  const { profile } = useCachedProfile(user?.id);
  const [data, setData] = useState<PassportData>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<PassportStamp | null>(null);

  const refresh = useCallback(async (isPull = false) => {
    if (isPull) setRefreshing(true);
    const result = await getMyPassport();
    if (result.data) setData(result.data);
    setError(result.error);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => {
    if (profile?.role === 'student') void refresh();
  }, [profile?.role, refresh]));

  const count = data.signature.filter(stamp => stamp.earnedAt).length;
  const total = data.signature.length;
  const progress = total ? Math.round(100 * count / total) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF"/>
        </Pressable>
        <Text style={styles.headerTitle}>Event Passport</Text>
        <View style={styles.headerSpace}/>
      </View>
      {profile?.role !== 'student' ? (
        <View style={styles.center}><Text style={styles.error}>The Event Passport is available to students.</Text></View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh(true)} tintColor={COLORS.primary}/>}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}><Ionicons name="book-outline" color="#FFFFFF" size={27}/></View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Your Campus Collection</Text>
              <Text style={styles.heroSubtitle}>A memory from every school event you attend.</Text>
            </View>
          </View>

          {loading ? <View style={styles.loading}><ActivityIndicator color={COLORS.primary}/><Text style={styles.muted}>Opening your passport...</Text></View> : null}
          {error ? <Pressable style={styles.errorBox} onPress={() => void refresh()}>
            <Ionicons name="alert-circle-outline" color={COLORS.danger} size={19}/>
            <Text style={styles.error}>{error}. Tap to retry.</Text>
          </Pressable> : null}

          {!loading && !error ? (
            <>
              <View style={styles.summary}>
                <View style={styles.summaryTop}>
                  <View><Text style={styles.summaryCaption}>Commemorative stamps</Text><Text style={styles.big}>{count} <Text style={styles.of}>/ {total}</Text></Text></View>
                  <View style={styles.summaryPill}><Ionicons name="ribbon-outline" size={17} color={COLORS.primary}/><Text style={styles.summaryPillText}>{data.earnedCount} collected</Text></View>
                </View>
                <View style={styles.track}><View style={[styles.fill, { width: `${progress}%` as `${number}%` }]}/></View>
                <Text style={styles.muted}>Special collections are earned through verified attendance.</Text>
              </View>
              <View style={styles.sectionTop}>
                <Text style={styles.sectionTitle}>Signature Collections</Text>
                <Text style={styles.sectionCaption}>Limited annual editions</Text>
              </View>
              {data.signature.length ? (
                <View style={styles.grid}>{data.signature.map(stamp =>
                  <View key={stamp.key} style={styles.gridItem}><StampCard stamp={stamp} onPress={() => setSelected(stamp)}/></View>
                )}</View>
              ) : (
                <View style={styles.empty}><Ionicons name="albums-outline" color={COLORS.primary} size={25}/><Text style={styles.muted}>No published collections yet.</Text></View>
              )}
              <View style={styles.sectionTop}>
                <Text style={styles.sectionTitle}>Event Memories</Text>
                <Text style={styles.sectionCaption}>{data.regular.length} collected</Text>
              </View>
              {data.regular.length ? (
                <View style={styles.grid}>{data.regular.map(stamp =>
                  <View key={stamp.key} style={styles.gridItem}><StampCard stamp={stamp} compact onPress={() => setSelected(stamp)}/></View>
                )}</View>
              ) : (
                <View style={styles.empty}><Ionicons name="sparkles-outline" color={COLORS.primary} size={26}/><Text style={styles.emptyTitle}>Your collection starts here</Text><Text style={styles.muted}>Attend a school event and scan its QR to earn your first stamp.</Text></View>
              )}
            </>
          ) : null}
        </ScrollView>
      )}

      <Modal visible={!!selected} animationType="fade" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalShade}>
          <View style={styles.modalCard}>
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>Stamp Details</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close details" hitSlop={12} onPress={() => setSelected(null)}>
                <Ionicons name="close" color={COLORS.textSecondary} size={23}/>
              </Pressable>
            </View>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {selected ? (
                <>
                  <View style={styles.modalStamp}>
                    <StampCard stamp={selected} showCaption={false}/>
                  </View>
                  <Text style={styles.detailTitle}>{selected.title}</Text>
                  {selected.earnedAt ? (
                    <>
                      <View style={styles.detailStatusRow}>
                        <Ionicons name="checkmark-circle" color={COLORS.success} size={17}/>
                        <Text style={styles.detailStatus}>Collected</Text>
                      </View>
                      <Text style={styles.detailText}>Earned: {new Date(selected.earnedAt).toLocaleString()}</Text>
                      {selected.eventTitle ? <Text style={styles.detailText}>First qualifying event: {selected.eventTitle}</Text> : null}
                      {selected.venue ? <Text style={styles.detailText}>Venue: {selected.venue}</Text> : null}
                      {selected.eventIds.length > 1 ? <Text style={styles.detailText}>{selected.eventIds.length} qualifying events in this collection</Text> : null}
                    </>
                  ) : (
                    <View style={styles.lockedMessage}>
                      <Ionicons name="lock-closed-outline" color={COLORS.textSecondary} size={16}/>
                      <Text style={styles.lockedMessageText}>Attend an eligible event to collect this commemorative stamp.</Text>
                    </View>
                  )}
                </>
              ) : null}
            </ScrollView>
            <Pressable accessibilityRole="button" style={styles.done} onPress={() => setSelected(null)}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  header: { minHeight: 55, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.navy },
  back: { width: 42, height: 42, justifyContent: 'center' },
  headerSpace: { width: 42 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  scroll: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 17, paddingTop: 17, paddingBottom: 42 },
  hero: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#13274F', borderRadius: 19, padding: 18, gap: 14 },
  heroIcon: { width: 55, height: 55, borderRadius: 17, backgroundColor: '#2C50AC', justifyContent: 'center', alignItems: 'center' },
  heroCopy: { flex: 1 },
  heroTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  heroSubtitle: { marginTop: 5, fontSize: 11, lineHeight: 17, color: '#C7D5F1' },
  summary: { backgroundColor: COLORS.card, padding: 17, borderRadius: 19, borderWidth: 1, borderColor: COLORS.border, marginTop: 16 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryCaption: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  big: { color: COLORS.textPrimary, fontSize: 27, fontWeight: '900', marginTop: 3 },
  of: { color: COLORS.textSecondary, fontSize: 18, fontWeight: '700' },
  summaryPill: { backgroundColor: COLORS.primarySoft, borderRadius: 30, paddingHorizontal: 11, paddingVertical: 7, flexDirection: 'row', gap: 5, alignItems: 'center' },
  summaryPillText: { color: COLORS.primary, fontSize: 10, fontWeight: '800' },
  track: { height: 7, backgroundColor: '#E6EAF1', borderRadius: 6, overflow: 'hidden', marginTop: 12, marginBottom: 8 },
  fill: { height: '100%', backgroundColor: '#2C9C81', borderRadius: 6 },
  sectionTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 8, rowGap: 4, marginTop: 24, marginBottom: 13 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: COLORS.textPrimary, flexShrink: 1 },
  sectionCaption: { fontSize: 10, color: COLORS.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 15, alignItems: 'flex-start' },
  gridItem: { width: '48%', minWidth: 0 },
  empty: { backgroundColor: COLORS.card, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 9 },
  emptyTitle: { fontWeight: '800', fontSize: 13, color: COLORS.textPrimary },
  muted: { color: COLORS.textSecondary, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  loading: { paddingTop: 45, gap: 12, alignItems: 'center' },
  errorBox: { marginTop: 15, padding: 13, borderRadius: 14, backgroundColor: COLORS.dangerSoft, flexDirection: 'row', gap: 8 },
  error: { flex: 1, color: COLORS.danger, fontSize: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 22, backgroundColor: COLORS.background },
  modalShade: { flex: 1, backgroundColor: 'rgba(8,18,42,.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 20 },
  modalCard: { width: '100%', maxWidth: 420, maxHeight: '88%', backgroundColor: COLORS.card, borderRadius: 22, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 18, alignItems: 'stretch', overflow: 'hidden' },
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 18 },
  modalScroll: { width: '100%', flexShrink: 1 },
  modalScrollContent: { alignItems: 'center', paddingBottom: 10, paddingHorizontal: 3 },
  modalStamp: { width: 196, maxWidth: '100%', alignSelf: 'center', marginBottom: 16 },
  detailTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '900', textAlign: 'center', lineHeight: 21, marginBottom: 8 },
  detailStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 },
  detailStatus: { color: COLORS.success, fontWeight: '800', fontSize: 12 },
  detailText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19, marginTop: 7 },
  lockedMessage: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 7, paddingHorizontal: 10, marginTop: 4 },
  lockedMessageText: { flexShrink: 1, fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },
  done: { marginTop: 10, width: '100%', minHeight: 48, backgroundColor: COLORS.primary, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  doneText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
});
