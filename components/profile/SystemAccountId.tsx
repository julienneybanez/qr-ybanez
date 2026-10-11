import Ionicons from '@expo/vector-icons/Ionicons';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  userId?: string | null;
};

export default function SystemAccountId({
  userId,
}: Props) {
  return (
    <>
      <Text style={styles.sectionLabel}>
        System Account ID
      </Text>

      <View style={styles.idCard}>
        <Ionicons
          name="finger-print-outline"
          size={19}
          color={COLORS.textSecondary}
        />

        <Text
          style={styles.userId}
          numberOfLines={1}
        >
          {userId ?? '—'}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  idCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userId: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
});
