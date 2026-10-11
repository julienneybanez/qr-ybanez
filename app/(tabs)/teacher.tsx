import {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import {
  useCallback,
  useState,
} from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EventQRCodeCard from '@/components/teacher/EventQRCodeCard';
import TeacherEventForm, {
  type EditTarget,
  type MessageType,
} from '@/components/teacher/TeacherEventForm';
import TeacherEventList from '@/components/teacher/TeacherEventList';
import TeacherStateScreen from '@/components/teacher/TeacherStateScreen';
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

  const handleSaveEvent = async () => {
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
      event.title + ' will stop accepting attendance scans.',
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
      <TeacherStateScreen loading />
    );
  }

  if (
    profile?.role !== 'teacher'
  ) {
    return <TeacherStateScreen />;
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TeacherEventForm
          editingEvent={editingEvent}
          title={title}
          eventId={eventId}
          venue={venue}
          description={description}
          startDate={startDate}
          endDate={endDate}
          editTarget={editTarget}
          editingPart={editingPart}
          isAndroid={isAndroid}
          saving={saving}
          message={message}
          messageType={messageType}
          onTitleChange={setTitle}
          onEventIdChange={setEventId}
          onVenueChange={setVenue}
          onDescriptionChange={setDescription}
          onOpenPicker={openPicker}
          onPickerChange={onPickerChange}
          onQuickEnd={handleQuickEnd}
          onSave={() => {
            void handleSaveEvent();
          }}
          onCancel={resetForm}
        />

        {qrEvent ? (
          <EventQRCodeCard
            event={qrEvent}
          />
        ) : null}

        <TeacherEventList
          events={events}
          loading={eventsLoading}
          onEdit={handleEdit}
          onShowQr={handleShowQr}
          onClose={handleCloseEvent}
        />
      </ScrollView>
    </SafeAreaView>
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
});
