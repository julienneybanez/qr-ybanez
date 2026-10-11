import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  email: string;
};

export default function RegistrationSuccessCard({
  email,
}: Props) {
  return (
    <View style={styles.successCard}>
      <View style={styles.successIcon}>
        <Ionicons
          name="mail-unread-outline"
          size={30}
          color={COLORS.success}
        />
      </View>

      <Text style={styles.successTitle}>
        Check your email
      </Text>

      <Text style={styles.successText}>
        We sent a confirmation link to{' '}
        {email}. Verify your account, then come back and sign in.
      </Text>

      <Link
        href="/login"
        style={styles.successLink}
      >
        Back to Sign In
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  successCard: {
    marginTop: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  successText: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  successLink: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
