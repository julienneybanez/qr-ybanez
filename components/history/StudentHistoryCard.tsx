import Ionicons from '@expo/vector-icons/Ionicons';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import type { AttendanceRecord } from '@/lib/attendance';

import { formatHistoryDate } from './historyUtils';

type Props = {
  item: AttendanceRecord;
};

export default function StudentHistoryCard({
  item,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.eventIcon}>
          <Ionicons
            name="checkmark-circle-outline"
            size={22}
            color={COLORS.success}
          />
        </View>

        <View style={styles.cardHeaderText}>
          <Text style={styles.eventTitle}>
            {item.eventTitle}
          </Text>

          <Text style={styles.eventCode}>
            {item.eventId}
          </Text>
        </View>

        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>
            Recorded
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons
          name="time-outline"
          size={16}
          color={COLORS.textSecondary}
        />

        <Text style={styles.metaText}>
          {formatHistoryDate(
            item.scannedAt
          )}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  eventCode: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    backgroundColor: COLORS.successSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginLeft: 8,
  },
  statusBadgeText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    gap: 7,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
