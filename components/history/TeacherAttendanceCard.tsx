import Ionicons from '@expo/vector-icons/Ionicons';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import type { TeacherEventAttendance } from '@/lib/attendance';

import {
  formatHistoryDate,
  shortProfileId,
} from './historyUtils';

type Props = {
  item: TeacherEventAttendance;
};

export default function TeacherAttendanceCard({
  item,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.eventIcon}>
          <Ionicons
            name="calendar-outline"
            size={21}
            color={COLORS.primary}
          />
        </View>

        <View style={styles.cardHeaderText}>
          <Text style={styles.eventTitle}>
            {item.title}
          </Text>

          <Text style={styles.eventCode}>
            {item.eventCode}
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countNumber}>
            {item.attendeeCount}
          </Text>

          <Text style={styles.countLabel}>
            attendees
          </Text>
        </View>
      </View>

      {item.startTime ? (
        <View style={styles.metaRow}>
          <Ionicons
            name="time-outline"
            size={16}
            color={COLORS.textSecondary}
          />

          <Text style={styles.metaText}>
            {formatHistoryDate(
              item.startTime
            )}
          </Text>
        </View>
      ) : null}

      {item.attendees.length === 0 ? (
        <Text style={styles.attendeeEmpty}>
          No attendees yet.
        </Text>
      ) : (
        <View style={styles.attendeeList}>
          {item.attendees.map(
            (attendee) => (
              <View
                key={attendee.profileId}
                style={styles.attendeeRow}
              >
                <View style={styles.attendeeAvatar}>
                  <Text style={styles.attendeeAvatarText}>
                    {(
                      attendee.studentName
                        ?.trim()?.[0] ??
                      '?'
                    ).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.attendeeInfo}>
                  <Text style={styles.attendeeName}>
                    {attendee.studentName ||
                      shortProfileId(
                        attendee.profileId
                      )}
                  </Text>

                  <Text style={styles.studentIdText}>
                    {attendee.studentId
                      ? 'Student ID: ' + attendee.studentId
                      : 'Student ID unavailable'}
                  </Text>

                  <Text style={styles.metaText}>
                    {formatHistoryDate(
                      attendee.scannedAt
                    )}
                  </Text>
                </View>
              </View>
            )
          )}
        </View>
      )}
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
  countBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  countNumber: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  countLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    marginTop: 1,
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
  attendeeList: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  attendeeAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  attendeeAvatarText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  studentIdText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 3,
  },
  attendeeEmpty: {
    marginTop: 14,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
