import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

import SplashLoader from '@/components/SplashLoader';
import { initializeAuth, useAuth } from '@/lib/auth';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, loading } = useAuth();

  useEffect(() => {
    void initializeAuth();
    void SplashScreen.hideAsync();
  }, []);

  if (loading) {
    return (
      <>
        <StatusBar style="light" />
        <SplashLoader />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
        </Stack.Protected>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
