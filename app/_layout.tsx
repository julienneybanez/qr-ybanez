import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

import {
  initializeAuth,
  useAuth,
} from '@/lib/auth';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const {
    session,
    loading,
  } = useAuth();

  useEffect(() => {
    void initializeAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      void SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Protected
        guard={!session}
      >
        <Stack.Screen
          name="login"
        />

        <Stack.Screen
          name="register"
        />
      </Stack.Protected>

      <Stack.Protected
        guard={!!session}
      >
        <Stack.Screen
          name="(tabs)"
        />
      </Stack.Protected>
    </Stack>
  );
}