import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
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
import { useEffect } from 'react';

export default function TabLayout() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const {
    profile,
    loading: profileLoading,
    refreshing: profileRefreshing,
    error: profileError,
  } =
    useCachedProfile(
      user?.id
    );

  /*
   * Prefetch the role-specific data after the profile is known.
   * Cached data remains visible while screens refresh in the
   * background.
   */
  useEffect(() => {
    if (
      !user ||
      !profile
    ) {
      return;
    }

    if (
      profile.role ===
      'student'
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
      profile.role ===
      'teacher'
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
   * Do not render role-based tabs until the profile request has
   * completed. This prevents Student/Teacher tabs from briefly
   * appearing with the wrong visibility.
   */
  if (
    user &&
    (
      profileLoading ||
      (
        profileRefreshing &&
        !profile
      )
    )
  ) {
    return (
      <View
        style={
          styles.loadingScreen
        }
      >
        <ActivityIndicator
          size="large"
          color={
            COLORS.primary
          }
        />
      </View>
    );
  }

  /*
   * A failed profile request no longer triggers an automatic
   * retry loop. Show a controlled error state and let the user
   * retry explicitly.
   */
  if (
    user &&
    !profile
  ) {
    return (
      <View
        style={
          styles.profileErrorScreen
        }
      >
        <View
          style={
            styles.profileErrorIcon
          }
        >
          <Ionicons
            name="cloud-offline-outline"
            size={30}
            color={
              COLORS.primary
            }
          />
        </View>

        <Text
          style={
            styles.profileErrorTitle
          }
        >
          Unable to load profile
        </Text>

        <Text
          style={
            styles.profileErrorText
          }
        >
          {profileError
            ? 'We could not load your account profile. Check your connection and try again.'
            : 'Your account profile could not be found. Try again or sign in again.'}
        </Text>

        <View
          style={
            styles.retryButton
          }
        >
          <AppButton
            theme="primary"
            title={
              profileRefreshing
                ? 'Retrying...'
                : 'Retry'
            }
            icon="refresh-outline"
            disabled={
              profileRefreshing
            }
            onPress={() => {
              if (!user) {
                return;
              }

              void refreshCachedProfile(
                user.id
              );
            }}
          />
        </View>
      </View>
    );
  }

  const isStudent =
    profile?.role ===
    'student';

  const isTeacher =
    profile?.role ===
    'teacher';

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
          marginTop: 1,
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
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.background,
    },

    profileErrorScreen: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal: 28,
      backgroundColor:
        COLORS.background,
    },

    profileErrorIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginBottom: 18,
      backgroundColor:
        COLORS.primarySoft,
    },

    profileErrorTitle: {
      fontSize: 20,
      fontWeight: '700',
      color:
        COLORS.textPrimary,
      textAlign:
        'center',
    },

    profileErrorText: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 20,
      color:
        COLORS.textSecondary,
      textAlign:
        'center',
      maxWidth: 360,
    },

    retryButton: {
      width: '100%',
      maxWidth: 320,
      marginTop: 20,
    },
  });
