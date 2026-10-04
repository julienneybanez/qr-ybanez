import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';

export default function Index() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Header
          title="QR Attendance"
          subtitle="School event attendance made simple"
        />

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="qr-code-outline"
              size={28}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>
              Ready to check in?
            </Text>

            <Text style={styles.heroSubtitle}>
              Scan the event QR code to record your attendance.
            </Text>
          </View>
        </View>

        <AppButton
          theme="primary"
          title="Scan QR Code"
          icon="scan-outline"
          onPress={() => router.push('/scan')}
        />

        <View style={styles.quickRow}>
          <QuickAction
            title="History"
            subtitle="View records"
            icon="time-outline"
            onPress={() => router.push('/history')}
          />

          <QuickAction
            title="Profile"
            subtitle="Your account"
            icon="person-outline"
            onPress={() => router.push('/profile')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type QuickActionProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function QuickAction({
  title,
  subtitle,
  icon,
  onPress,
}: QuickActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickCard,
        pressed && styles.quickCardPressed,
      ]}
    >
      <View style={styles.quickIcon}>
        <Ionicons
          name={icon}
          size={22}
          color={COLORS.primary}
        />
      </View>

      <Text style={styles.quickTitle}>
        {title}
      </Text>

      <Text style={styles.quickSubtitle}>
        {subtitle}
      </Text>

      <Ionicons
        name="arrow-forward-outline"
        size={17}
        color={COLORS.textSecondary}
        style={styles.quickArrow}
      />
    </Pressable>
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
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
  },

  heroCard: {
    marginTop: 20,
    marginBottom: 24,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  heroText: {
    flex: 1,
  },

  heroTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },

  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },

  quickRow: {
    flexDirection: 'row',
    gap: 12,
  },

  quickCard: {
    flex: 1,
    minHeight: 132,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    position: 'relative',
  },

  quickCardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },

  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  quickTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  quickSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  quickArrow: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
});