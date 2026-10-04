import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/colors';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
} from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import {
  getEventsByTeacher,
  getStudentEvents,
} from '@/lib/events';
import {
  refreshCachedProfile,
  useCachedProfile,
} from '@/lib/profile-cache';

export default function TabLayout() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const {
    profile,
    loading: profileLoading,
  } = useCachedProfile(user?.id);

  /*
   * If the profile cache somehow has no profile,
   * retry it instead of permanently hiding
   * the role-specific tabs.
   */
  useEffect(() => {
    if (
      user &&
      !profile &&
      !profileLoading
    ) {
      void refreshCachedProfile(
        user.id
      );
    }
  }, [
    user,
    profile,
    profileLoading,
  ]);

  /*
   * Prefetch data after we know the role.
   * This makes the other tabs feel faster
   * when the user opens them.
   */
  useEffect(() => {
    if (
      !user ||
      !profile
    ) {
      return;
    }

    if (
      profile.role === 'student'
    ) {
      void Promise.all([
        getStudentEvents(),
        getAttendanceHistory(
          user.id
        ),
      ]);

      return;
    }

    if (
      profile.role === 'teacher'
    ) {
      void Promise.all([
        getEventsByTeacher(
          user.id
        ),
        getTeacherEventAttendance(
          user.id
        ),
      ]);
    }
  }, [
    user?.id,
    profile?.role,
  ]);

  /*
   * Only show this once while determining
   * the account role. We do not want the
   * tab bar rendered with the wrong tabs.
   */
  if (
    user &&
    (!profile || profileLoading)
  ) {
    return (
      <View
        style={
          styles.loadingScreen
        }
      >
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
      </View>
    );
  }

  const isStudent =
    profile?.role === 'student';

  const isTeacher =
    profile?.role === 'teacher';

  const bottomPadding =
    Math.max(
      insets.bottom,
      12
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarHideOnKeyboard:
          true,

        tabBarActiveTintColor:
          COLORS.primary,

        tabBarInactiveTintColor:
          COLORS.textSecondary,

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },

        tabBarStyle: {
          backgroundColor:
            COLORS.card,

          borderTopColor:
            COLORS.border,

          borderTopWidth: 1,

          height:
            58 +
            bottomPadding,

          paddingTop: 7,

          paddingBottom:
            bottomPadding,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'home'
                  : 'home-outline'
              }
              color={color}
              size={23}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',

          /*
           * undefined = normal visible tab
           * null = hidden tab
           */
          href: isStudent
            ? undefined
            : null,

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'calendar'
                  : 'calendar-outline'
              }
              color={color}
              size={23}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',

          href: isStudent
            ? undefined
            : null,

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'qr-code'
                  : 'qr-code-outline'
              }
              color={color}
              size={23}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: 'History',

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'time'
                  : 'time-outline'
              }
              color={color}
              size={23}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="teacher"
        options={{
          title: 'Manage',

          href: isTeacher
            ? undefined
            : null,

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'calendar'
                  : 'calendar-outline'
              }
              color={color}
              size={23}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'person'
                  : 'person-outline'
              }
              color={color}
              size={23}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles =
  StyleSheet.create({
    loadingScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.background,
    },
  });