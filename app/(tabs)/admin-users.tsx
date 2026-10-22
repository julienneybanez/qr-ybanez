import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { COLORS } from '@/constants/colors';
import { getAdminUsers, type AdminUser } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { useCachedProfile } from '@/lib/profile-cache';
import type { Role } from '@/lib/profiles';

type FilterRole = 'all' | Role;

export default function AdminUsersScreen() {
  const { user } = useAuth();
  const { profile } = useCachedProfile(user?.id);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<FilterRole>('all');

  const loadUsers = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    const result = await getAdminUsers();
    setUsers(result.data);
    setError(result.error);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (profile?.role === 'admin') void loadUsers();
    }, [profile?.role, loadUsers])
  );

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return users.filter((item) => {
      const matchesRole = roleFilter === 'all' || item.role === roleFilter;
      const matchesSearch =
        !needle ||
        item.full_name?.toLowerCase().includes(needle) ||
        item.email.toLowerCase().includes(needle) ||
        item.student_id?.toLowerCase().includes(needle);

      return matchesRole && matchesSearch;
    });
  }, [users, query, roleFilter]);

  if (profile?.role !== 'admin') {
    return <AccessDenied title="User Management" />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <PageHeader title="Users" subtitle="View registered Student, Teacher, and Admin accounts." />
      <View style={styles.container}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={19} color={COLORS.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, email, or Student ID"
            placeholderTextColor={COLORS.textSecondary}
            style={styles.searchInput}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.filters}>
          {(['all', 'student', 'teacher', 'admin'] as FilterRole[]).map((role) => (
            <Pressable key={role} onPress={() => setRoleFilter(role)} style={[styles.filterChip, roleFilter === role && styles.filterChipActive]}>
              <Text style={[styles.filterText, roleFilter === role && styles.filterTextActive]}>
                {role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? <ErrorBanner message={error} onRetry={() => void loadUsers()} /> : null}

        {loading && users.length === 0 ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.stateText}>Loading users...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <UserCard item={item} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={() => void loadUsers(true)}
            ListEmptyComponent={<EmptyState icon="people-outline" title="No users found" message="Try changing your search or role filter." />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function UserCard({ item }: { item: AdminUser }) {
  const roleLabel = item.role.charAt(0).toUpperCase() + item.role.slice(1);
  const initials = (item.full_name?.trim()?.[0] || item.email[0] || 'U').toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.name} numberOfLines={1}>{item.full_name || 'Unnamed account'}</Text>
          <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{roleLabel}</Text></View>
        </View>
        <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
        {item.role === 'student' ? (
          <View style={styles.metaRow}>
            <Ionicons name="card-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>Student ID: {item.student_id || 'Not assigned'}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function AccessDenied({ title }: { title: string }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <PageHeader title={title} />
      <View style={styles.centerState}>
        <Ionicons name="shield-outline" size={34} color={COLORS.primary} />
        <Text style={styles.emptyTitle}>Admins only</Text>
        <Text style={styles.stateText}>This section is available only to Admin accounts.</Text>
      </View>
    </SafeAreaView>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Pressable onPress={onRetry} style={styles.errorBanner}>
      <Ionicons name="alert-circle-outline" size={18} color={COLORS.danger} />
      <Text style={styles.errorBannerText} numberOfLines={2}>{message} Tap to retry.</Text>
    </Pressable>
  );
}

function EmptyState({ icon, title, message }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={28} color={COLORS.primary} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.stateText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.navy },
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 16, paddingTop: 14 },
  searchBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },
  filters: { flexDirection: 'row', gap: 7, marginTop: 10, marginBottom: 12 },
  filterChip: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primarySoft, borderColor: '#9DB0FF' },
  filterText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.primary },
  list: { paddingBottom: 110 },
  card: { flexDirection: 'row', gap: 12, backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 13, marginBottom: 10 },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primarySoft },
  avatarText: { color: COLORS.primary, fontSize: 17, fontWeight: '900' },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, color: COLORS.textPrimary, fontSize: 13.5, fontWeight: '800' },
  email: { marginTop: 4, color: COLORS.textSecondary, fontSize: 10.5 },
  roleBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: COLORS.primarySoft },
  roleBadgeText: { color: COLORS.primary, fontSize: 9, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  metaText: { color: COLORS.textSecondary, fontSize: 10.5, fontWeight: '600' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.dangerSoft, borderWidth: 1, borderColor: '#FFE0E5', borderRadius: 14, padding: 11, marginBottom: 10 },
  errorBannerText: { flex: 1, color: COLORS.danger, fontSize: 10.5, fontWeight: '600' },
  centerState: { flex: 1, minHeight: 320, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, backgroundColor: COLORS.background },
  emptyState: { minHeight: 300, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  emptyIcon: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primarySoft, marginBottom: 12 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  stateText: { color: COLORS.textSecondary, fontSize: 11.5, lineHeight: 18, textAlign: 'center', marginTop: 5 },
});
