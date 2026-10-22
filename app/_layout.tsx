import { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import SplashLoader from '../components/SplashLoader';
import { initializeAuth, useAuth } from '../lib/auth';

void SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
  duration: 300,
  fade: true,
});

export default function RootLayout() {
  const { session, loading } = useAuth();

  useEffect(() => {
    void initializeAuth();
  }, []);

  const handleLayout = useCallback(() => {
    SplashScreen.hide();
  }, []);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <StatusBar style="light" />

      {loading ? (
        <SplashLoader />
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!session}>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
          </Stack.Protected>

          <Stack.Protected guard={!!session}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>
        </Stack>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C1530',
  },
});