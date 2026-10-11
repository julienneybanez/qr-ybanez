import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { COLORS } from '@/constants/colors';
import type { CloudEvent } from '@/lib/events';
import { buildQRPayload } from '@/lib/qr';

import { formatDateTime } from './formatDateTime';

type Props = {
  event: CloudEvent;
};

export default function EventQRCodeCard({
  event,
}: Props) {
  return (
    <View style={styles.qrCard}>
      <Text style={styles.qrTitle}>
        Event QR
      </Text>

      <Text style={styles.qrSubtitle}>
        Students can scan this code from the Scan tab.
      </Text>

      <View style={styles.qrBox}>
        <QRCode
          value={buildQRPayload({
            eventId: event.event_code,
          })}
          size={200}
        />
      </View>

      <Text style={styles.qrEventTitle}>
        {event.title}
      </Text>

      <Text style={styles.qrEventCode}>
        {event.event_code}
      </Text>

      {event.venue ? (
        <Text style={styles.qrSchedule}>
          {event.venue}
        </Text>
      ) : null}

      {event.start_time && event.end_time ? (
        <Text style={styles.qrSchedule}>
          {formatDateTime(
            new Date(event.start_time)
          )}{' '}
          –{' '}
          {formatDateTime(
            new Date(event.end_time)
          )}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  qrCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 18,
    marginTop: 10,
    marginBottom: 26,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  qrSubtitle: {
    marginTop: 4,
    marginBottom: 16,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  qrEventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  qrEventCode: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  qrSchedule: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
