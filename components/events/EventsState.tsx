import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  message: string;
};

export default function EventsState({
  loading = false,
  icon,
  title,
  message,
}: Props) {
  return (
    <View style={styles.centerState}>
      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
      ) : icon ? (
        <View style={styles.emptyIcon}>
          <Ionicons
            name={icon}
            size={30}
            color={COLORS.primary}
          />
        </View>
      ) : null}

      {title ? (
        <Text style={styles.emptyTitle}>
          {title}
        </Text>
      ) : null}

      <Text style={styles.stateText}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centerState: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  stateText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
});
