import Ionicons from '@expo/vector-icons/Ionicons';

import {
  useFocusEffect,
} from 'expo-router';

import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import { COLORS } from '@/constants/colors';

import { useAuth } from '@/lib/auth';

import {
  getEventDisplayStatus,
  getStudentEvents,
  peekStudentEvents,
  type CloudEvent,
  type EventDisplayStatus,
} from '@/lib/events';

import {
  useCachedProfile,
} from '@/lib/profile-cache';

export default function EventsScreen() {
  const { user } = useAuth();

  const {
    profile,
  } = useCachedProfile(
    user?.id
  );

  const cachedEvents =
    peekStudentEvents();

  const [
    events,
    setEvents,
  ] = useState<
    CloudEvent[]
  >(
    () =>
      cachedEvents ?? []
  );

  const [
    loading,
    setLoading,
  ] = useState(
    () =>
      cachedEvents === null
  );

  const refreshEvents =
    useCallback(async () => {
      if (
        profile?.role !==
        'student'
      ) {
        return;
      }

      const cached =
        peekStudentEvents();

      if (cached) {
        setEvents(cached);

        setLoading(false);
      } else {
        setLoading(true);
      }

      const rows =
        await getStudentEvents();

      setEvents(rows);

      setLoading(false);
    }, [profile?.role]);

  useFocusEffect(
    useCallback(() => {
      void refreshEvents();
    }, [refreshEvents])
  );

  const sortedEvents =
    useMemo(() => {
      const rank: Record<
        EventDisplayStatus,
        number
      > = {
        Ongoing: 0,
        Upcoming: 1,
        Ended: 2,
        Closed: 3,
      };

      return [
        ...events,
      ].sort(
        (a, b) => {
          const statusA =
            getEventDisplayStatus(
              a
            );

          const statusB =
            getEventDisplayStatus(
              b
            );

          const difference =
            rank[statusA] -
            rank[statusB];

          if (
            difference !== 0
          ) {
            return difference;
          }

          const startA =
            a.start_time
              ? new Date(
                  a.start_time
                ).getTime()
              : Number.MAX_SAFE_INTEGER;

          const startB =
            b.start_time
              ? new Date(
                  b.start_time
                ).getTime()
              : Number.MAX_SAFE_INTEGER;

          return (
            startA - startB
          );
        }
      );
    }, [events]);

  if (
    loading &&
    events.length === 0
  ) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
        edges={['top']}
      >
        <View
          style={
            styles.centerState
          }
        >
          <ActivityIndicator
            size="large"
            color={
              COLORS.primary
            }
          />

          <Text
            style={
              styles.stateText
            }
          >
            Loading events...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (
    profile?.role !==
    'student'
  ) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
        edges={['top']}
      >
        <View
          style={
            styles.centerState
          }
        >
          <View
            style={
              styles.emptyIcon
            }
          >
            <Ionicons
              name="school-outline"
              size={30}
              color={
                COLORS.primary
              }
            />
          </View>

          <Text
            style={
              styles.emptyTitle
            }
          >
            Students only
          </Text>

          <Text
            style={
              styles.stateText
            }
          >
            Student accounts can browse school events here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
      edges={['top']}
    >
      <View
        style={
          styles.container
        }
      >
        <View
          style={
            styles.pageHeader
          }
        >
          <Text
            style={styles.title}
          >
            Events
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            View upcoming, ongoing, and recently ended school events.
          </Text>
        </View>

        {sortedEvents.length ===
        0 ? (
          <View
            style={
              styles.centerState
            }
          >
            <View
              style={
                styles.emptyIcon
              }
            >
              <Ionicons
                name="calendar-outline"
                size={30}
                color={
                  COLORS.primary
                }
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No events available
            </Text>

            <Text
              style={
                styles.stateText
              }
            >
              Open school events will appear here once a teacher creates them.
            </Text>
          </View>
        ) : (
          <FlatList
            data={
              sortedEvents
            }
            keyExtractor={(
              item
            ) =>
              item.id
            }
            renderItem={({
              item,
            }) => (
              <EventCard
                event={item}
              />
            )}
            contentContainerStyle={
              styles.list
            }
            showsVerticalScrollIndicator={
              false
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function EventCard({
  event,
}: {
  event: CloudEvent;
}) {
  const status =
    getEventDisplayStatus(
      event
    );

  const badgeStyle =
    status === 'Ongoing'
      ? styles.ongoingBadge
      : status ===
          'Upcoming'
        ? styles.upcomingBadge
        : styles.endedBadge;

  const badgeTextColor =
    status === 'Ongoing'
      ? COLORS.success
      : status ===
          'Upcoming'
        ? COLORS.warning
        : COLORS.textSecondary;

  return (
    <View
      style={styles.card}
    >
      <View
        style={
          styles.cardTop
        }
      >
        <View
          style={
            styles.cardHeading
          }
        >
          <Text
            style={
              styles.eventTitle
            }
          >
            {event.title}
          </Text>

          <Text
            style={
              styles.eventCode
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
        <Text
          style={
            styles.description
          }
        >
          {event.description}
        </Text>
      ) : null}

      {status ===
      'Ongoing' ? (
        <View
          style={
            styles.noticeBox
          }
        >
          <Ionicons
            name="qr-code-outline"
            size={18}
            color={
              COLORS.primary
            }
          />

          <Text
            style={
              styles.noticeText
            }
          >
            This event is currently accepting attendance. Scan the teacher&apos;s QR code from the Scan tab.
          </Text>
        </View>
      ) : status ===
        'Upcoming' ? (
        <View
          style={
            styles.upcomingNotice
          }
        >
          <Ionicons
            name="time-outline"
            size={18}
            color={
              COLORS.warning
            }
          />

          <Text
            style={
              styles.upcomingNoticeText
            }
          >
            Attendance will open when the event starts.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function MetaRow({
  icon,
  text,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;

  text: string;
}) {
  return (
    <View
      style={styles.metaRow}
    >
      <Ionicons
        name={icon}
        size={17}
        color={
          COLORS.textSecondary
        }
      />

      <Text
        style={
          styles.metaText
        }
      >
        {text}
      </Text>
    </View>
  );
}

function formatSchedule(
  startIso: string,
  endIso: string | null
) {
  const start =
    new Date(startIso);

  const startText =
    start.toLocaleString(
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

  const end =
    new Date(endIso);

  const endText =
    end.toLocaleString(
      undefined,
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
    );

  return `${startText} – ${endText}`;
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    container: {
      flex: 1,
      backgroundColor:
        COLORS.background,
      paddingHorizontal: 20,
      paddingTop: 12,
    },

    pageHeader: {
      marginBottom: 18,
    },

    title: {
      fontSize: 24,
      fontWeight: '700',
      color:
        COLORS.textPrimary,
    },

    subtitle: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 19,
      color:
        COLORS.textSecondary,
    },

    list: {
      paddingBottom: 28,
    },

    card: {
      backgroundColor:
        COLORS.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 16,
      marginBottom: 12,
    },

    cardTop: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      marginBottom: 2,
    },

    cardHeading: {
      flex: 1,
      minWidth: 0,
    },

    eventTitle: {
      fontSize: 16,
      fontWeight: '700',
      color:
        COLORS.textPrimary,
    },

    eventCode: {
      marginTop: 3,
      fontSize: 11,
      fontWeight: '600',
      color:
        COLORS.primary,
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

    endedBadge: {
      backgroundColor:
        COLORS.surface,
    },

    statusText: {
      fontSize: 10,
      fontWeight: '700',
    },

    metaRow: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      gap: 7,
      marginTop: 12,
    },

    metaText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      color:
        COLORS.textSecondary,
    },

    description: {
      marginTop: 13,
      fontSize: 13,
      lineHeight: 19,
      color:
        COLORS.textPrimary,
    },

    noticeBox: {
      marginTop: 15,
      backgroundColor:
        COLORS.primarySoft,
      borderRadius: 11,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems:
        'flex-start',
      gap: 8,
    },

    noticeText: {
      flex: 1,
      color:
        COLORS.primary,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '600',
    },

    upcomingNotice: {
      marginTop: 15,
      backgroundColor:
        COLORS.warningSoft,
      borderRadius: 11,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems:
        'flex-start',
      gap: 8,
    },

    upcomingNoticeText: {
      flex: 1,
      color:
        COLORS.warning,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '600',
    },

    centerState: {
      flex: 1,
      minHeight: 300,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 24,
    },

    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor:
        COLORS.primarySoft,
      alignItems: 'center',
      justifyContent:
        'center',
      marginBottom: 14,
    },

    emptyTitle: {
      fontSize: 17,
      fontWeight: '700',
      color:
        COLORS.textPrimary,
      marginBottom: 6,
      textAlign: 'center',
    },

    stateText: {
      fontSize: 13,
      lineHeight: 19,
      color:
        COLORS.textSecondary,
      textAlign: 'center',
      marginTop: 10,
    },
  });