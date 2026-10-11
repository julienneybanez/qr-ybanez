import { useFocusEffect } from 'expo-router';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EventsState from '@/components/events/EventsState';
import StudentEventCard from '@/components/events/StudentEventCard';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  getEventDisplayStatus,
  getStudentEvents,
  peekStudentEvents,
  type CloudEvent,
  type EventDisplayStatus,
} from '@/lib/events';
import { useCachedProfile } from '@/lib/profile-cache';

export default function EventsScreen() {
  const { user } = useAuth();

  const { profile } =
    useCachedProfile(user?.id);

  const cachedEvents =
    peekStudentEvents();

  const [events, setEvents] =
    useState<CloudEvent[]>(
      () => cachedEvents ?? []
    );

  const [loading, setLoading] =
    useState(
      () => cachedEvents === null
    );

  const refreshEvents = useCallback(
    async () => {
      if (
        profile?.role !== 'student'
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
    },
    [profile?.role]
  );

  useFocusEffect(
    useCallback(() => {
      void refreshEvents();
    }, [refreshEvents])
  );

  const sortedEvents = useMemo(() => {
    const rank: Record<
      EventDisplayStatus,
      number
    > = {
      Ongoing: 0,
      Upcoming: 1,
      Ended: 2,
      Closed: 3,
    };

    return [...events].sort(
      (a, b) => {
        const statusA =
          getEventDisplayStatus(a);

        const statusB =
          getEventDisplayStatus(b);

        const difference =
          rank[statusA] -
          rank[statusB];

        if (difference !== 0) {
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

        return startA - startB;
      }
    );
  }, [events]);

  if (
    loading &&
    events.length === 0
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={['top']}
      >
        <EventsState
          loading
          message="Loading events..."
        />
      </SafeAreaView>
    );
  }

  if (
    profile?.role !== 'student'
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={['top']}
      >
        <EventsState
          icon="school-outline"
          title="Students only"
          message="Student accounts can browse school events here."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <View style={styles.container}>
        <View style={styles.pageHeader}>
          <Text style={styles.title}>
            Events
          </Text>

          <Text style={styles.subtitle}>
            View upcoming, ongoing, and recently ended school events.
          </Text>
        </View>

        {sortedEvents.length === 0 ? (
          <EventsState
            icon="calendar-outline"
            title="No events available"
            message="Open school events will appear here once a teacher creates them."
          />
        ) : (
          <FlatList
            data={sortedEvents}
            keyExtractor={(item) =>
              item.id
            }
            renderItem={({ item }) => (
              <StudentEventCard
                event={item}
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
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
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  pageHeader: {
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  list: {
    paddingBottom: 28,
  },
});
