import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import {
  getEventDisplayStatus,
  type CloudEvent,
} from '@/lib/events';

import { formatDateTime } from './formatDateTime';

type Props = {
  events: CloudEvent[];
  loading: boolean;
  onEdit: (event: CloudEvent) => void;
  onShowQr: (event: CloudEvent) => void;
  onClose: (event: CloudEvent) => void;
};

export default function TeacherEventList({
  events,
  loading,
  onEdit,
  onShowQr,
  onClose,
}: Props) {
  return (
    <>
      <View style={styles.eventsHeader}>
        <Text style={styles.eventsTitle}>
          My Events
        </Text>

        <Text style={styles.eventsSubtitle}>
          View, edit, close, or display an event QR.
        </Text>
      </View>

      {loading && events.length === 0 ? (
        <ActivityIndicator
          size="small"
          color={COLORS.primary}
          style={styles.eventsLoader}
        />
      ) : events.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="calendar-outline"
            size={27}
            color={COLORS.primary}
          />

          <Text style={styles.emptyTitle}>
            No events yet
          </Text>

          <Text style={styles.emptyText}>
            Your created events will appear here.
          </Text>
        </View>
      ) : (
        events.map((event) => (
          <TeacherEventCard
            key={event.id}
            event={event}
            onEdit={() => onEdit(event)}
            onShowQr={() => onShowQr(event)}
            onClose={() => onClose(event)}
          />
        ))
      )}
    </>
  );
}

type EventCardProps = {
  event: CloudEvent;
  onEdit: () => void;
  onShowQr: () => void;
  onClose: () => void;
};

function TeacherEventCard({
  event,
  onEdit,
  onShowQr,
  onClose,
}: EventCardProps) {
  const displayStatus =
    getEventDisplayStatus(event);

  const canShowQr =
    displayStatus === 'Upcoming' ||
    displayStatus === 'Ongoing';

  const canClose = canShowQr;

  const badgeStyle =
    displayStatus === 'Ongoing'
      ? styles.ongoingBadge
      : displayStatus === 'Upcoming'
        ? styles.upcomingBadge
        : styles.inactiveBadge;

  const badgeTextColor =
    displayStatus === 'Ongoing'
      ? COLORS.success
      : displayStatus === 'Upcoming'
        ? COLORS.warning
        : COLORS.textSecondary;

  return (
    <View style={styles.eventCard}>
      <View style={styles.eventCardTop}>
        <View style={styles.eventCardText}>
          <Text style={styles.eventCardTitle}>
            {event.title}
          </Text>

          <Text style={styles.eventCardCode}>
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
            {displayStatus}
          </Text>
        </View>
      </View>

      {event.venue ? (
        <View style={styles.eventMetaRow}>
          <Ionicons
            name="location-outline"
            size={16}
            color={COLORS.textSecondary}
          />

          <Text style={styles.eventMeta}>
            {event.venue}
          </Text>
        </View>
      ) : null}

      {event.start_time ? (
        <View style={styles.eventMetaRow}>
          <Ionicons
            name="time-outline"
            size={16}
            color={COLORS.textSecondary}
          />

          <Text style={styles.eventMeta}>
            {formatDateTime(
              new Date(event.start_time)
            )}
          </Text>
        </View>
      ) : null}

      {event.description ? (
        <Text style={styles.eventDescription}>
          {event.description}
        </Text>
      ) : null}

      <View style={styles.eventActions}>
        <SmallAction
          label="Edit"
          icon="create-outline"
          onPress={onEdit}
        />

        {canShowQr ? (
          <SmallAction
            label="QR"
            icon="qr-code-outline"
            onPress={onShowQr}
          />
        ) : null}

        {canClose ? (
          <SmallAction
            label="Close"
            icon="close-circle-outline"
            onPress={onClose}
            danger
          />
        ) : null}
      </View>
    </View>
  );
}

type SmallActionProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
};

function SmallAction({
  label,
  icon,
  onPress,
  danger = false,
}: SmallActionProps) {
  const color = danger
    ? COLORS.danger
    : COLORS.primary;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallAction,
        danger && styles.smallActionDanger,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={color}
      />

      <Text
        style={[
          styles.smallActionText,
          { color },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eventsHeader: {
    marginTop: 10,
    marginBottom: 12,
  },
  eventsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  eventsSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },
  eventsLoader: {
    marginVertical: 24,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 22,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptyText: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  eventCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
  },
  eventCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eventCardText: {
    flex: 1,
    minWidth: 0,
  },
  eventCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  eventCardCode: {
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
  inactiveBadge: {
    backgroundColor: COLORS.surface,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  eventMeta: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  eventDescription: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  eventActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  smallAction: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  smallActionDanger: {
    backgroundColor: COLORS.dangerSoft,
  },
  smallActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
