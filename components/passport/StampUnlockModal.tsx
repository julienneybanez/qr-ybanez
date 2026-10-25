import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import StampCard from './StampCard';
import type { PassportStamp } from '@/lib/passport';
import { COLORS } from '@/constants/colors';

type Props = { stamp: PassportStamp | null; onClose: () => void; onViewPassport: () => void };

export default function StampUnlockModal({ stamp, onClose, onViewPassport }: Props) {
  const scale = useRef(new Animated.Value(.55)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!stamp) return;
    scale.setValue(.55);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 48, friction: 7, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [stamp?.key, scale, opacity]);
  return (
    <Modal visible={!!stamp} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.emblem}><Ionicons name="sparkles" size={23} color={COLORS.primary}/></View>
          <Text style={styles.eyebrow}>NEW COLLECTIBLE</Text>
          <Text style={styles.title}>Stamp Unlocked!</Text>
          <Text style={styles.description}>Your attendance earned a new addition to your Event Passport.</Text>
          {stamp ? (
            <Animated.View style={[styles.preview, { opacity, transform: [{ scale }] }]}>
              <StampCard stamp={stamp}/>
            </Animated.View>
          ) : null}
          <Pressable onPress={onViewPassport} style={styles.main}>
            <Ionicons name="book-outline" color="#FFFFFF" size={19}/>
            <Text style={styles.mainText}>View My Passport</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.secondary}>
            <Text style={styles.secondaryText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(8,18,42,.74)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  dialog: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 22, alignItems: 'center', width: '100%', maxWidth: 390 },
  emblem: { backgroundColor: '#EBF3FF', width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  eyebrow: { color: COLORS.primary, fontWeight: '900', fontSize: 10, letterSpacing: 2 },
  title: { color: '#182542', fontWeight: '900', fontSize: 23, marginTop: 5 },
  description: { color: '#6F7C91', fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 7 },
  preview: { width: 176, marginVertical: 17 },
  main: { height: 49, backgroundColor: COLORS.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 14, width: '100%' },
  mainText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  secondary: { padding: 14 },
  secondaryText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 12 },
});
