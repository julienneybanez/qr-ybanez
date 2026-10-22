import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { getAdminDashboardStats, type AdminDashboardStats } from '@/lib/admin';
import { formatAuditAction, getAuditLogs, type AuditLog } from '@/lib/audit';

const EMPTY_STATS: AdminDashboardStats = {
  totalUsers: 0,
  students: 0,
  teachers: 0,
  admins: 0,
  totalEvents: 0,
  openEvents: 0,
  closedEvents: 0,
  attendanceRecords: 0,
  presentAttendance: 0,
  lateAttendance: 0,
  excusedAttendance: 0,
};

export default function AdminHome() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<AuditLog[]>([]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    const [statsResult, auditResult] = await Promise.all([
      getAdminDashboardStats(),
      getAuditLogs(5),
    ]);
    setStats(statsResult.data);
    setActivity(auditResult.data);
    setError(statsResult.error ?? auditResult.error);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStats();
    }, [loadStats])
  );


  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.glowLarge} />
          <View style={styles.glowSmall} />
          <View style={styles.heroTop}>
            <View style={styles.brandRow}>
              <View style={styles.logoShell}>
                <Image source={require('../../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
              </View>
              <View>
                <Text style={styles.brandTitle}>QR Attendance</Text>
                <Text style={styles.brandSub}>QR-Ybanez</Text>
              </View>
            </View>
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={15} color="#FFFFFF" />
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.sectionTop}>
            <Text style={styles.sectionTitle}>Overview</Text>
            {loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}
          </View>

          {error ? (
            <Pressable onPress={() => void loadStats()} style={styles.errorCard}>
              <Ionicons name="cloud-offline-outline" size={20} color={COLORS.danger} />
              <View style={styles.errorCopy}>
                <Text style={styles.errorTitle}>Could not refresh dashboard</Text>
                <Text style={styles.errorText}>Tap to try again.</Text>
              </View>
            </Pressable>
          ) : null}

          <View style={styles.statsGrid}>
            <StatCard icon="people-outline" value={stats.totalUsers} label="Users" />
            <StatCard icon="calendar-outline" value={stats.totalEvents} label="Events" />
            <StatCard icon="checkmark-done-outline" value={stats.attendanceRecords} label="Attendance" />
            <StatCard icon="radio-button-on-outline" value={stats.openEvents} label="Open Events" />
          </View>

          <View style={styles.roleCard}>
            <Text style={styles.roleCardTitle}>Accounts by role</Text>
            <RoleCount icon="school-outline" label="Students" value={stats.students} />
            <View style={styles.divider} />
            <RoleCount icon="people-outline" label="Teachers" value={stats.teachers} />
            <View style={styles.divider} />
            <RoleCount icon="shield-checkmark-outline" label="Admins" value={stats.admins} />
          </View>

          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            {activity.length === 0 ? (
              <View style={styles.activityEmpty}><Ionicons name="pulse-outline" size={20} color={COLORS.primary}/><Text style={styles.activityEmptyText}>System activity will appear here.</Text></View>
            ) : activity.map((item, index) => (
              <View key={item.id} style={[styles.activityRow, index < activity.length - 1 && styles.activityBorder]}>
                <View style={styles.activityIcon}><Ionicons name={activityIcon(item.action)} size={16} color={COLORS.primary}/></View>
                <View style={styles.activityCopy}>
                  <Text style={styles.activityText}>{formatAuditAction(item)}</Text>
                  <Text style={styles.activityTime}>{new Date(item.createdAt).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Management</Text>
          <View style={styles.quickGrid}>
            <QuickAction title="Users" subtitle="Manage registered accounts" icon="people-outline" onPress={() => router.push('/admin-users')} />
            <QuickAction title="Events" subtitle="Create and manage events" icon="calendar-outline" onPress={() => router.push('/admin-events')} />
            <QuickAction title="Attendance" subtitle="Monitor and correct records" icon="checkmark-done-outline" onPress={() => router.push('/admin-attendance')} />
            <QuickAction title="Reports" subtitle="View system summaries" icon="bar-chart-outline" onPress={() => router.push('/admin-reports')} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function activityIcon(action:string):keyof typeof Ionicons.glyphMap {
  if(action.startsWith('attendance_')) return 'checkmark-done-outline';
  if(action.startsWith('event_')) return 'calendar-outline';
  if(action.startsWith('profile_')) return 'person-outline';
  return 'pulse-outline';
}

function StatCard({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: number; label: string }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}><Ionicons name={icon} size={21} color={COLORS.primary} /></View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RoleCount({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number }) {
  return (
    <View style={styles.roleRow}>
      <View style={styles.roleIcon}><Ionicons name={icon} size={18} color={COLORS.primary} /></View>
      <Text style={styles.roleLabel}>{label}</Text>
      <Text style={styles.roleValue}>{value}</Text>
    </View>
  );
}

function QuickAction({ title, subtitle, icon, onPress }: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>
      <View style={styles.quickIcon}><Ionicons name={icon} size={22} color={COLORS.primary} /></View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickSubtitle}>{subtitle}</Text>
      <Ionicons name="arrow-forward-outline" size={18} color={COLORS.primary} style={styles.quickArrow} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.navy },
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 110 },
  hero: { minHeight: 154, backgroundColor: COLORS.navy, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28, overflow: 'hidden' },
  glowLarge: { position: 'absolute', width: 210, height: 210, borderRadius: 105, backgroundColor: '#2148CC', right: -96, bottom: -126 },
  glowSmall: { position: 'absolute', width: 132, height: 132, borderRadius: 66, backgroundColor: '#376BFF', right: 40, bottom: -90, opacity: 0.7 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  logoShell: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.1)', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 32, height: 32 },
  brandTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  brandSub: { color: '#9FAACA', fontSize: 11, fontWeight: '600', marginTop: 2 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(67,108,255,.38)', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)' },
  adminBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  body: { paddingHorizontal: 16, marginTop: 0, paddingTop: 16 },
  sectionTop: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 10 },
  errorCard: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: COLORS.dangerSoft, borderRadius: 16, padding: 13, marginBottom: 12, borderWidth: 1, borderColor: '#FFE0E5' },
  errorCopy: { flex: 1 },
  errorTitle: { color: COLORS.danger, fontSize: 12, fontWeight: '800' },
  errorText: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', flexGrow: 1, minHeight: 118, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 14 },
  statIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  statValue: { marginTop: 12, color: COLORS.textPrimary, fontSize: 24, fontWeight: '900' },
  statLabel: { marginTop: 2, color: COLORS.textSecondary, fontSize: 10.5, fontWeight: '600' },
  roleCard: { marginTop: 12, marginBottom: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 14 },
  roleCardTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800', marginBottom: 5 },
  roleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  roleIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  roleLabel: { flex: 1, color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  roleValue: { color: COLORS.primary, fontSize: 15, fontWeight: '900' },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 44 },
  activityCard:{backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:20,paddingHorizontal:13,marginBottom:20},
  activityRow:{minHeight:58,flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10},
  activityBorder:{borderBottomWidth:1,borderBottomColor:COLORS.border},
  activityIcon:{width:34,height:34,borderRadius:11,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center'},
  activityCopy:{flex:1},
  activityText:{fontSize:10.5,lineHeight:15,color:COLORS.textPrimary,fontWeight:'700'},
  activityTime:{marginTop:3,fontSize:8.5,color:COLORS.textSecondary},
  activityEmpty:{minHeight:70,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8},
  activityEmptyText:{fontSize:10.5,color:COLORS.textSecondary},
  quickGrid: { gap: 10 },
  quickCard: { position: 'relative', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 14, minHeight: 86, justifyContent: 'center', paddingLeft: 66, paddingRight: 44 },
  quickIcon: { position: 'absolute', left: 14, width: 40, height: 40, borderRadius: 13, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  quickTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  quickSubtitle: { marginTop: 4, color: COLORS.textSecondary, fontSize: 10.5 },
  quickArrow: { position: 'absolute', right: 15 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
