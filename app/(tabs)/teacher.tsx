import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  closeEvent,
  createEvent,
  getEventDisplayStatus,
  getEventsByTeacher,
  peekTeacherEvents,
  updateEvent,
  type CloudEvent,
} from '@/lib/events';
import { useCachedProfile } from '@/lib/profile-cache';
import { buildQRPayload } from '@/lib/qr';

function formatDateTime(date: Date) {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function parseEventDate(
  value: string | null,
  fallback: Date
) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? fallback
    : parsed;
}

const QUICK_END_OPTIONS = [
  {
    label: '+30 min',
    ms: 30 * 60 * 1000,
  },
  {
    label: '+1 hour',
    ms: 60 * 60 * 1000,
  },
  {
    label: '+2 hours',
    ms: 2 * 60 * 60 * 1000,
  },
];

type EditTarget = 'start' | 'end';
type MessageType = 'success' | 'error';

export default function TeacherScreen() {
  const { user } = useAuth();

  const {
    profile,
    loading: roleLoading,
  } = useCachedProfile(user?.id);

  const initialEvents = user
    ? peekTeacherEvents(user.id)
    : null;

  const [
    eventsLoading,
    setEventsLoading,
  ] = useState(
    initialEvents === null
  );

  const [events, setEvents] = useState<
    CloudEvent[]
  >(
    () => initialEvents ?? []
  );

  const [
    editingEvent,
    setEditingEvent,
  ] = useState<CloudEvent | null>(null);

  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [venue, setVenue] = useState('');
  const [
    description,
    setDescription,
  ] = useState('');

  const [startDate, setStartDate] =
    useState(() => new Date());

  const [endDate, setEndDate] = useState(
    () =>
      new Date(
        Date.now() + 60 * 60 * 1000
      )
  );

  const [editTarget, setEditTarget] =
    useState<EditTarget | null>(null);

  const [
    editingPart,
    setEditingPart,
  ] = useState<'date' | 'time'>('date');

  const [qrEvent, setQrEvent] =
    useState<CloudEvent | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  const [
    messageType,
    setMessageType,
  ] = useState<MessageType>('success');

  const [saving, setSaving] =
    useState(false);

  const loadTeacherEvents =
    useCallback(
      async (
        showInitialLoader = false
      ) => {
        if (!user) {
          return;
        }

        const cached =
          peekTeacherEvents(
            user.id
          );

        if (cached) {
          setEvents(cached);
          setEventsLoading(false);
        } else if (
          showInitialLoader
        ) {
          setEventsLoading(true);
        }

        const rows =
          await getEventsByTeacher(
            user.id
          );

        setEvents(rows);
        setEventsLoading(false);
      },
      [user]
    );

  useFocusEffect(
    useCallback(() => {
      if (
        profile?.role !==
        'teacher'
      ) {
        return;
      }

      void loadTeacherEvents(true);
    }, [
      profile?.role,
      loadTeacherEvents,
    ])
  );

  const isAndroid =
    Platform.OS === 'android';

  const resetForm = () => {
    const now = new Date();

    setEditingEvent(null);
    setTitle('');
    setEventId('');
    setVenue('');
    setDescription('');
    setStartDate(now);

    setEndDate(
      new Date(
        now.getTime() +
          60 * 60 * 1000
      )
    );

    setEditTarget(null);
    setEditingPart('date');
  };

  const openPicker = (
    target: EditTarget
  ) => {
    setMessage(null);
    setEditTarget(target);
    setEditingPart('date');
  };

  const onPickerChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ) => {
    if (!editTarget) {
      return;
    }

    if (
      event.type === 'dismissed' ||
      !selected
    ) {
      setEditTarget(null);
      setEditingPart('date');
      return;
    }

    const current =
      editTarget === 'start'
        ? startDate
        : endDate;

    const next = new Date(current);

    if (
      isAndroid &&
      editingPart === 'date'
    ) {
      next.setFullYear(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate()
      );
    } else if (
      isAndroid &&
      editingPart === 'time'
    ) {
      next.setHours(
        selected.getHours(),
        selected.getMinutes(),
        0,
        0
      );
    } else {
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
    }

    if (editTarget === 'start') {
      setStartDate(next);
    } else {
      setEndDate(next);
    }

    if (
      isAndroid &&
      editingPart === 'date'
    ) {
      setEditingPart('time');
    } else {
      setEditTarget(null);
      setEditingPart('date');
    }
  };

  const handleQuickEnd = (
    ms: number
  ) => {
    setMessage(null);

    setEndDate(
      new Date(
        startDate.getTime() + ms
      )
    );
  };

  const validateForm = () => {
    if (
      !title.trim() ||
      !eventId.trim()
    ) {
      setMessageType('error');
      setMessage(
        'Event title and code are required.'
      );

      return false;
    }

    if (!venue.trim()) {
      setMessageType('error');
      setMessage(
        'Venue is required.'
      );

      return false;
    }

    if (
      endDate.getTime() <=
      startDate.getTime()
    ) {
      setMessageType('error');

      setMessage(
        'End time must be after start time.'
      );

      return false;
    }

    return true;
  };

  const handleSaveEvent =
    async () => {
      setMessage(null);

      if (!validateForm()) {
        return;
      }

      setSaving(true);

      if (editingEvent) {
        const { data, error } =
          await updateEvent(
            editingEvent.id,
            {
              title: title.trim(),
              venue: venue.trim(),
              description:
                description.trim(),
              start:
                startDate.toISOString(),
              end:
                endDate.toISOString(),
            }
          );

        setSaving(false);

        if (error || !data) {
          setMessageType('error');

          setMessage(
            error ||
              'Could not update the event.'
          );

          return;
        }

        setMessageType('success');
        setMessage('Event updated.');
        setQrEvent(data);

        resetForm();

        await loadTeacherEvents();

        return;
      }

      const { data, error } =
        await createEvent({
          eventId: eventId.trim(),
          title: title.trim(),
          venue: venue.trim(),
          description:
            description.trim(),
          start:
            startDate.toISOString(),
          end:
            endDate.toISOString(),
        });

      setSaving(false);

      if (error || !data) {
        setMessageType('error');

        if (
          error
            ?.toLowerCase()
            .includes('duplicate') ||
          error
            ?.toLowerCase()
            .includes('unique')
        ) {
          setMessage(
            'That event code is already in use.'
          );
        } else {
          setMessage(
            error ||
              'Could not save the event.'
          );
        }

        return;
      }

      setMessageType('success');

      setMessage(
        'Event saved. Your QR code is ready below.'
      );

      setQrEvent(data);

      await loadTeacherEvents();
    };

  const handleEdit = (
    event: CloudEvent
  ) => {
    const now = new Date();

    const fallbackEnd = new Date(
      now.getTime() +
        60 * 60 * 1000
    );

    setEditingEvent(event);
    setEventId(event.event_code);
    setTitle(event.title);
    setVenue(event.venue ?? '');

    setDescription(
      event.description ?? ''
    );

    setStartDate(
      parseEventDate(
        event.start_time,
        now
      )
    );

    setEndDate(
      parseEventDate(
        event.end_time,
        fallbackEnd
      )
    );

    setQrEvent(null);
    setMessage(null);
  };

  const handleShowQr = (
    event: CloudEvent
  ) => {
    const displayStatus =
      getEventDisplayStatus(event);

    if (
      displayStatus === 'Closed' ||
      displayStatus === 'Ended'
    ) {
      setMessageType('error');

      setMessage(
        displayStatus === 'Closed'
          ? 'Closed events cannot accept attendance.'
          : 'Ended events can no longer accept attendance.'
      );

      return;
    }

    setQrEvent(event);
    setMessage(null);
  };

  const handleCloseEvent = (
    event: CloudEvent
  ) => {
    Alert.alert(
      'Close event?',
      `${event.title} will stop accepting attendance scans.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Close Event',
          style: 'destructive',

          onPress: async () => {
            const { error } =
              await closeEvent(
                event.id
              );

            if (error) {
              setMessageType(
                'error'
              );

              setMessage(
                'Could not close the event.'
              );

              return;
            }

            if (
              qrEvent?.id ===
              event.id
            ) {
              setQrEvent(null);
            }

            setMessageType(
              'success'
            );

            setMessage(
              'Event closed.'
            );

            await loadTeacherEvents();
          },
        },
      ]
    );
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

  if (
    profile?.role !==
    'teacher'
  ) {
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
          Only teacher accounts can manage events.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        <Text style={styles.title}>
          {editingEvent
            ? 'Edit Event'
            : 'Create Event'}
        </Text>

        <Text style={styles.subtitle}>
          {editingEvent
            ? 'Update the event details below.'
            : 'Create an event and generate its attendance QR code.'}
        </Text>

        <Text
          style={styles.sectionLabel}
        >
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
            placeholderTextColor={
              COLORS.textSecondary
            }
            editable={!saving}
          />

          <Text style={styles.label}>
            Event code
          </Text>

          <TextInput
            style={[
              styles.input,
              editingEvent &&
                styles.inputDisabled,
            ]}
            value={eventId}
            onChangeText={setEventId}
            placeholder="e.g. EVT-2026-0002"
            placeholderTextColor={
              COLORS.textSecondary
            }
            autoCapitalize="characters"
            editable={
              !editingEvent &&
              !saving
            }
          />

          {editingEvent ? (
            <Text
              style={styles.fieldHint}
            >
              Event codes stay the same after creation so existing QR codes remain valid.
            </Text>
          ) : null}

          <Text style={styles.label}>
            Venue
          </Text>

          <TextInput
            style={styles.input}
            value={venue}
            onChangeText={setVenue}
            placeholder="e.g. School Gymnasium"
            placeholderTextColor={
              COLORS.textSecondary
            }
            editable={!saving}
          />

          <Text style={styles.label}>
            Description
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.multilineInput,
            ]}
            value={description}
            onChangeText={
              setDescription
            }
            placeholder="Add event details or instructions"
            placeholderTextColor={
              COLORS.textSecondary
            }
            multiline
            textAlignVertical="top"
            editable={!saving}
          />
        </View>

        <Text
          style={styles.sectionLabel}
        >
          Schedule
        </Text>

        <View style={styles.card}>
          <PickerField
            label="Starts"
            value={formatDateTime(
              startDate
            )}
            icon="sunny-outline"
            onPress={() =>
              openPicker('start')
            }
          />

          <View style={styles.divider} />

          <PickerField
            label="Ends"
            value={formatDateTime(
              endDate
            )}
            icon="moon-outline"
            onPress={() =>
              openPicker('end')
            }
          />

          <Text
            style={styles.quickLabel}
          >
            Duration
          </Text>

          <View style={styles.chipRow}>
            {QUICK_END_OPTIONS.map(
              (option) => (
                <Pressable
                  key={
                    option.label
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.chip,
                    pressed &&
                      styles.pressed,
                  ]}
                  onPress={() =>
                    handleQuickEnd(
                      option.ms
                    )
                  }
                  disabled={saving}
                >
                  <Text
                    style={
                      styles.chipText
                    }
                  >
                    {option.label}
                  </Text>
                </Pressable>
              )
            )}
          </View>
        </View>

        {editTarget ? (
          <View
            style={
              styles.pickerContainer
            }
          >
            <DateTimePicker
              value={
                editTarget ===
                'start'
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
              onChange={
                onPickerChange
              }
            />
          </View>
        ) : null}

        {message ? (
          <View
            style={[
              styles.messageBox,
              messageType ===
              'success'
                ? styles.successBox
                : styles.errorBox,
            ]}
          >
            <Ionicons
              name={
                messageType ===
                'success'
                  ? 'checkmark-circle-outline'
                  : 'alert-circle-outline'
              }
              size={20}
              color={
                messageType ===
                'success'
                  ? COLORS.success
                  : COLORS.danger
              }
            />

            <Text
              style={[
                styles.messageText,
                {
                  color:
                    messageType ===
                    'success'
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
          title={
            saving
              ? 'Saving...'
              : editingEvent
                ? 'Save Changes'
                : 'Create Event'
          }
          icon={
            editingEvent
              ? 'save-outline'
              : 'add-circle-outline'
          }
          onPress={handleSaveEvent}
          disabled={saving}
        />

        {editingEvent ? (
          <AppButton
            variant="secondary"
            title="Cancel Editing"
            icon="close-outline"
            onPress={resetForm}
            disabled={saving}
          />
        ) : null}

        {qrEvent ? (
          <View style={styles.qrCard}>
            <Text
              style={styles.qrTitle}
            >
              Event QR
            </Text>

            <Text
              style={
                styles.qrSubtitle
              }
            >
              Students can scan this code from the Scan tab.
            </Text>

            <View style={styles.qrBox}>
              <QRCode
                value={buildQRPayload({
                  eventId:
                    qrEvent.event_code,
                })}
                size={200}
              />
            </View>

            <Text
              style={
                styles.qrEventTitle
              }
            >
              {qrEvent.title}
            </Text>

            <Text
              style={
                styles.qrEventCode
              }
            >
              {qrEvent.event_code}
            </Text>

            {qrEvent.venue ? (
              <Text
                style={
                  styles.qrSchedule
                }
              >
                {qrEvent.venue}
              </Text>
            ) : null}

            {qrEvent.start_time &&
            qrEvent.end_time ? (
              <Text
                style={
                  styles.qrSchedule
                }
              >
                {formatDateTime(
                  new Date(
                    qrEvent.start_time
                  )
                )}{' '}
                –{' '}
                {formatDateTime(
                  new Date(
                    qrEvent.end_time
                  )
                )}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View
          style={styles.eventsHeader}
        >
          <Text
            style={styles.eventsTitle}
          >
            My Events
          </Text>

          <Text
            style={
              styles.eventsSubtitle
            }
          >
            View, edit, close, or display an event QR.
          </Text>
        </View>

        {eventsLoading &&
        events.length === 0 ? (
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
            style={styles.eventsLoader}
          />
        ) : events.length === 0 ? (
          <View
            style={styles.emptyCard}
          >
            <Ionicons
              name="calendar-outline"
              size={27}
              color={COLORS.primary}
            />

            <Text
              style={styles.emptyTitle}
            >
              No events yet
            </Text>

            <Text
              style={styles.emptyText}
            >
              Your created events will appear here.
            </Text>
          </View>
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={() =>
                handleEdit(event)
              }
              onShowQr={() =>
                handleShowQr(event)
              }
              onClose={() =>
                handleCloseEvent(
                  event
                )
              }
            />
          ))
        )}
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
      <View
        style={styles.pickerIcon}
      >
        <Ionicons
          name={icon}
          size={19}
          color={COLORS.primary}
        />
      </View>

      <View
        style={styles.pickerText}
      >
        <Text
          style={styles.pickerLabel}
        >
          {label}
        </Text>

        <Text
          style={styles.pickerValue}
        >
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

function EventCard({
  event,
  onEdit,
  onShowQr,
  onClose,
}: {
  event: CloudEvent;
  onEdit: () => void;
  onShowQr: () => void;
  onClose: () => void;
}) {
  const displayStatus =
    getEventDisplayStatus(event);

  const canShowQr =
    displayStatus === 'Upcoming' ||
    displayStatus === 'Ongoing';

  const canClose =
    displayStatus === 'Upcoming' ||
    displayStatus === 'Ongoing';

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
      <View
        style={styles.eventCardTop}
      >
        <View
          style={styles.eventCardText}
        >
          <Text
            style={
              styles.eventCardTitle
            }
          >
            {event.title}
          </Text>

          <Text
            style={
              styles.eventCardCode
            }
          >
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
              {
                color:
                  badgeTextColor,
              },
            ]}
          >
            {displayStatus}
          </Text>
        </View>
      </View>

      {event.venue ? (
        <View
          style={styles.eventMetaRow}
        >
          <Ionicons
            name="location-outline"
            size={16}
            color={
              COLORS.textSecondary
            }
          />

          <Text
            style={styles.eventMeta}
          >
            {event.venue}
          </Text>
        </View>
      ) : null}

      {event.start_time ? (
        <View
          style={styles.eventMetaRow}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={
              COLORS.textSecondary
            }
          />

          <Text
            style={styles.eventMeta}
          >
            {formatDateTime(
              new Date(
                event.start_time
              )
            )}
          </Text>
        </View>
      ) : null}

      {event.description ? (
        <Text
          style={
            styles.eventDescription
          }
        >
          {event.description}
        </Text>
      ) : null}

      <View
        style={styles.eventActions}
      >
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

function SmallAction({
  label,
  icon,
  onPress,
  danger = false,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
}) {
  const color = danger
    ? COLORS.danger
    : COLORS.primary;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallAction,
        danger &&
          styles.smallActionDanger,
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
  safeArea: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
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
    backgroundColor:
      COLORS.background,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 14,
  },

  inputDisabled: {
    opacity: 0.65,
  },

  multilineInput: {
    minHeight: 92,
  },

  fieldHint: {
    marginTop: -8,
    marginBottom: 14,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
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
    backgroundColor:
      COLORS.primarySoft,
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
    backgroundColor:
      COLORS.primarySoft,
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
    backgroundColor:
      COLORS.successSoft,
  },

  errorBox: {
    backgroundColor:
      COLORS.dangerSoft,
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
    backgroundColor:
      COLORS.successSoft,
  },

  upcomingBadge: {
    backgroundColor:
      COLORS.warningSoft,
  },

  inactiveBadge: {
    backgroundColor:
      COLORS.surface,
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
    backgroundColor:
      COLORS.primarySoft,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  smallActionDanger: {
    backgroundColor:
      COLORS.dangerSoft,
  },

  smallActionText: {
    fontSize: 11,
    fontWeight: '700',
  },

  stateScreen: {
    flex: 1,
    backgroundColor:
      COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor:
      COLORS.primarySoft,
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