import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';

export default function SplashLoader() {
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scan, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [scan]);

  const translateY = scan.interpolate({
    inputRange: [0, 1],
    outputRange: [-36, 36],
  });

  return (
    <View style={styles.container}>
      <View style={styles.glowLarge} />
      <View style={styles.glowSmall} />
      <View style={styles.scanShell}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
        <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
      </View>
      <Text style={styles.title}>QR Attendance</Text>
      <Text style={styles.brand}>QR-Ybanez</Text>
      <Text style={styles.subtitle}>School Event Attendance</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.navy,
    overflow: 'hidden',
  },
  glowLarge: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: '#1B3B9E',
    right: -190,
    bottom: -120,
  },
  glowSmall: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#2858E8',
    left: -145,
    top: -80,
    opacity: 0.48,
  },
  scanShell: {
    width: 116,
    height: 116,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: 72, height: 72 },
  scanLine: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#6E91FF',
    shadowColor: '#6E91FF',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 7,
  },
  title: {
    marginTop: 22,
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brand: {
    marginTop: 4,
    color: '#9EABD0',
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 16,
    color: '#C2CAE0',
    fontSize: 12,
  },
});
