import Ionicons from '@expo/vector-icons/Ionicons';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import {
  getEventDisplayStatus,
  type CloudEvent,
} from '@/lib/events';

type Props = {
  event: CloudEvent;
};

export default function StudentEventCard({
  event,
}: Props) {
  const status =
    getEventDisplayStatus(event);

  const badgeStyle =
    status === 'Ongoing'
      ? styles.ongoingBadge
      : status === 'Upcoming'
        ? styles.upcomingBadge
        : styles.endedBadge;

  const badgeTextColor =
    status === 'Ongoing'
      ? COLORS.success
      : status === 'Upcoming'
        ? COLORS.warning
        : COLORS.textSecondary;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardHeading}>
          <Text style={styles.eventTitle}>
            {event.title}
          </Text>

          <Text style={styles.eventCode}>
            {event.event_code}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            badgeStyle,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: badgeTextColor },
            ]}
          >
            {status}
          </Text>
        </View>
      </View>

      {event.venue ? (
        <MetaRow
          icon="location-outline"
          text={event.venue}
        />
      ) : null}

      {event.start_time ? (
        <MetaRow
          icon="calendar-outline"
          text={formatSchedule(
            event.start_time,
            event.end_time
          )}
        />
      ) : null}

      {event.description ? (
        <Text style={styles.description}>
          {event.description}
        </Text>
      ) : null}

      {status === 'Ongoing' ? (
        <View style={styles.noticeBox}>
          <Ionicons
            name="qr-code-outline"
            size={18}
            color={COLORS.primary}
          />

          <Text style={styles.noticeText}>
            This event is currently accepting attendance. Scan the teacher&apos;s QR code from the Scan tab.
          </Text>
        </View>
      ) : status === 'Upcoming' ? (
        <View style={styles.upcomingNotice}>
          <Ionicons
            name="time-outline"
            size={18}
            color={COLORS.warning}
          />

          <Text style={styles.upcomingNoticeText}>
            Attendance will open when the event starts.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

type MetaRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
};

function MetaRow({
  icon,
  text,
}: MetaRowProps) {
  return (
    <View style={styles.metaRow}>
      <Ionicons
        name={icon}
        size={17}
        color={COLORS.textSecondary}
      />

      <Text style={styles.metaText}>
        {text}
      </Text>
    </View>
  );
}

function formatSchedule(
  startIso: string,
  endIso: string | null
) {
  const startText =
    new Date(startIso).toLocaleString(
      undefined,
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
    );

  if (!endIso) {
    return startText;
  }

  const endText =
    new Date(endIso).toLocaleString(
      undefined,
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
    );

  return startText + ' – ' + endText;
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  cardHeading: {
    flex: 1,
    minWidth: 0,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  eventCode: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginLeft: 10,
  },
  ongoingBadge: {
    backgroundColor: COLORS.successSoft,
  },
  upcomingBadge: {
    backgroundColor: COLORS.warningSoft,
  },
  endedBadge: {
    backgroundColor: COLORS.surface,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 12,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  description: {
    marginTop: 13,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textPrimary,
  },
  noticeBox: {
    marginTop: 15,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  noticeText: {
    flex: 1,
    color: COLORS.primary,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  upcomingNotice: {
    marginTop: 15,
    backgroundColor: COLORS.warningSoft,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  upcomingNoticeText: {
    flex: 1,
    color: COLORS.warning,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
});
