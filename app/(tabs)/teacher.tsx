import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { createEvent } from '@/lib/events';
import { getProfile, type Role } from '@/lib/profiles';
import { buildQRPayload } from '@/lib/qr';

function toLocalISO(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
  );
}

function formatDateTime(date: Date) {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const QUICK_END_OPTIONS = [
  { label: '+30 min', ms: 30 * 60 * 1000 },
  { label: '+1 hour', ms: 60 * 60 * 1000 },
  { label: '+2 hours', ms: 2 * 60 * 60 * 1000 },
];

type EditTarget = 'start' | 'end';
type MessageType = 'success' | 'error';

export default function TeacherScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(
    () => new Date(Date.now() + 60 * 60 * 1000)
  );
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');
  const [payload, setPayload] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] =
    useState<MessageType>('success');

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!user) {
        setRoleLoading(false);

        return () => {
          active = false;
        };
      }

      getProfile(user.id).then((profile) => {
        if (!active) return;

        setRole(profile?.role ?? 'student');
        setRoleLoading(false);
      });

      return () => {
        active = false;
      };
    }, [user])
  );

  const isAndroid = Platform.OS === 'android';

  const openPicker = (target: EditTarget) => {
    setMessage(null);
    setEditTarget(target);
    setEditingPart('date');
  };

  const onPickerChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ) => {
    if (!editTarget) return;

    if (event.type === 'dismissed' || !selected) {
      setEditTarget(null);
      setEditingPart('date');
      return;
    }

    const current = editTarget === 'start' ? startDate : endDate;
    const next = new Date(current);

    next.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate()
    );

    next.setHours(
      selected.getHours(),
      selected.getMinutes(),
      0,
      0
    );

    if (editTarget === 'start') {
      setStartDate(next);
    } else {
      setEndDate(next);
    }

    if (isAndroid && editingPart === 'date') {
      setEditingPart('time');
    } else {
      setEditTarget(null);
      setEditingPart('date');
    }
  };

  const handleQuickEnd = (ms: number) => {
    setMessage(null);
    setEndDate(new Date(startDate.getTime() + ms));
  };

  const handleCreateEvent = async () => {
    const event = {
      eventId: eventId.trim(),
      title: title.trim(),
      start: toLocalISO(startDate),
      end: toLocalISO(endDate),
    };

    if (!event.eventId || !event.title) {
      setMessageType('error');
      setMessage('Event title and code are required.');
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setMessageType('error');
      setMessage('End time must be after start time.');
      return;
    }

    const { error } = await createEvent(event);

    if (error) {
      setMessageType('error');
      setMessage('Could not save the event. Please try again.');
      return;
    }

    setMessageType('success');
    setMessage('Event saved. Your QR code is ready below.');
    setPayload(buildQRPayload(event));
  };

  if (roleLoading) {
    return (
      <SafeAreaView
        style={styles.stateScreen}
        edges={['top']}
      >
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.stateText}>
          Checking your account...
        </Text>
      </SafeAreaView>
    );
  }

  if (role !== 'teacher') {
    return (
      <SafeAreaView
        style={styles.stateScreen}
        edges={['top']}
      >
        <View style={styles.lockIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={30}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.stateTitle}>
          Teachers only
        </Text>

        <Text style={styles.stateText}>
          Only teacher accounts can create event QR codes.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          Create Event
        </Text>

        <Text style={styles.subtitle}>
          Add the event details and generate a QR code for attendance.
        </Text>

        <Text style={styles.sectionLabel}>
          Event details
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>
            Event title
          </Text>

          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Founders Day Assembly"
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={styles.label}>
            Event code
          </Text>

          <TextInput
            style={styles.input}
            value={eventId}
            onChangeText={setEventId}
            placeholder="e.g. EVT-2026-0002"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="characters"
          />
        </View>

        <Text style={styles.sectionLabel}>
          Schedule
        </Text>

        <View style={styles.card}>
          <PickerField
            label="Starts"
            value={formatDateTime(startDate)}
            icon="sunny-outline"
            onPress={() => openPicker('start')}
          />

          <View style={styles.divider} />

          <PickerField
            label="Ends"
            value={formatDateTime(endDate)}
            icon="moon-outline"
            onPress={() => openPicker('end')}
          />

          <Text style={styles.quickLabel}>
            Quick duration
          </Text>

          <View style={styles.chipRow}>
            {QUICK_END_OPTIONS.map((option) => (
              <Pressable
                key={option.label}
                style={({ pressed }) => [
                  styles.chip,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleQuickEnd(option.ms)}
              >
                <Text style={styles.chipText}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {editTarget && (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={
                editTarget === 'start'
                  ? startDate
                  : endDate
              }
              mode={
                isAndroid
                  ? editingPart
                  : 'datetime'
              }
              display={
                isAndroid
                  ? 'default'
                  : 'spinner'
              }
              onChange={onPickerChange}
            />
          </View>
        )}

        {message ? (
          <View
            style={[
              styles.messageBox,
              messageType === 'success'
                ? styles.successBox
                : styles.errorBox,
            ]}
          >
            <Ionicons
              name={
                messageType === 'success'
                  ? 'checkmark-circle-outline'
                  : 'alert-circle-outline'
              }
              size={20}
              color={
                messageType === 'success'
                  ? COLORS.success
                  : COLORS.danger
              }
            />

            <Text
              style={[
                styles.messageText,
                {
                  color:
                    messageType === 'success'
                      ? COLORS.success
                      : COLORS.danger,
                },
              ]}
            >
              {message}
            </Text>
          </View>
        ) : null}

        <AppButton
          theme="primary"
          title="Create Event"
          icon="add-circle-outline"
          onPress={handleCreateEvent}
        />

        {payload ? (
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>
              Event QR
            </Text>

            <Text style={styles.qrSubtitle}>
              Students can scan this code from the Scan tab.
            </Text>

            <View style={styles.qrBox}>
              <QRCode
                value={payload}
                size={200}
              />
            </View>

            <Text style={styles.qrEventTitle}>
              {title.trim()}
            </Text>

            <Text style={styles.qrEventCode}>
              {eventId.trim()}
            </Text>

            <Text style={styles.qrSchedule}>
              {formatDateTime(startDate)} – {formatDateTime(endDate)}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

type PickerFieldProps = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function PickerField({
  label,
  value,
  icon,
  onPress,
}: PickerFieldProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pickerField,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.pickerIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.pickerText}>
        <Text style={styles.pickerLabel}>
          {label}
        </Text>

        <Text style={styles.pickerValue}>
          {value}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward-outline"
        size={18}
        color={COLORS.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 22,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  sectionLabel: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  pickerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  pickerText: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  pickerValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
    marginLeft: 49,
  },
  quickLabel: {
    marginTop: 15,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  pickerContainer: {
    marginTop: -8,
    marginBottom: 16,
    alignItems: 'center',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 12,
  },
  successBox: {
    backgroundColor: COLORS.successSoft,
  },
  errorBox: {
    backgroundColor: COLORS.dangerSoft,
  },
  messageText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  qrCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 18,
    marginTop: 10,
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
  stateScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 7,
  },
  stateText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
