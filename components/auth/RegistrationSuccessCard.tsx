import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';

type Props = { email: string };
export default function RegistrationSuccessCard({ email }: Props) {
  return (
    <View style={styles.successCard}>
      <View style={styles.successIcon}>
        <Ionicons name="mail-unread-outline" size={30} color={COLORS.success} />
      </View>
      <Text style={styles.successTitle}>Check your email</Text>
      <Text style={styles.successText}>We sent a confirmation link to <Text style={styles.email}>{email}</Text>. Verify your account, then come back and sign in.</Text>
      <Link href="/login" style={styles.successLink}>Back to Sign In</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  successCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 24, padding: 24, alignItems: 'center' },
  successIcon: { width: 70, height: 70, borderRadius: 22, backgroundColor: COLORS.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  successTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  successText: { marginTop: 8, marginBottom: 20, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary, textAlign: 'center' },
  email: { color: COLORS.primary, fontWeight: '700' },
  successLink: { color: COLORS.primary, fontWeight: '800', backgroundColor: COLORS.primarySoft, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, overflow: 'hidden' },
});
