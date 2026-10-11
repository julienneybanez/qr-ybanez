import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/colors';

type Props = {
  loading?: boolean;
};

export default function TeacherStateScreen({
  loading = false,
}: Props) {
  if (loading) {
    return (
      <SafeAreaView
        style={styles.stateScreen}
        edges={['top']}
      >
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.stateText}>
          Checking your account...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.stateScreen}
      edges={['top']}
    >
      <View style={styles.lockIcon}>
        <Ionicons
          name="lock-closed-outline"
          size={30}
          color={COLORS.primary}
        />
      </View>

      <Text style={styles.stateTitle}>
        Teachers only
      </Text>

      <Text style={styles.stateText}>
        Only teacher accounts can manage events.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stateScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 7,
  },
  stateText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
