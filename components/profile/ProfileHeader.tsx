import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import type { Role } from '@/lib/profiles';

type Props = {
  initials: string;
  name: string | null | undefined;
  role: Role | undefined;
};

export default function ProfileHeader({
  initials,
  name,
  role,
}: Props) {
  return (
    <View style={styles.profileHeader}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {initials}
        </Text>
      </View>

      <Text style={styles.profileName}>
        {name || 'Your name'}
      </Text>

      <View style={styles.roleBadge}>
        <Text style={styles.roleBadgeText}>
          {role === 'teacher'
            ? 'Teacher'
            : 'Student'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 26,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 28,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  roleBadge: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
