import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import type { Role } from '@/lib/profiles';

type Props = {
  role: Role;
  disabled: boolean;
  onChange: (role: Role) => void;
};

export default function RoleSelector({
  role,
  disabled,
  onChange,
}: Props) {
  return (
    <View style={styles.roleRow}>
      <RoleCard
        label="Student"
        icon="school-outline"
        selected={role === 'student'}
        onPress={() =>
          onChange('student')
        }
        disabled={disabled}
      />

      <RoleCard
        label="Teacher"
        icon="people-outline"
        selected={role === 'teacher'}
        onPress={() =>
          onChange('teacher')
        }
        disabled={disabled}
      />
    </View>
  );
}

type RoleCardProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
};

function RoleCard({
  label,
  icon,
  selected,
  onPress,
  disabled,
}: RoleCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.roleCard,
        selected && styles.roleCardSelected,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.roleIcon,
          selected && styles.roleIconSelected,
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={
            selected
              ? COLORS.primary
              : COLORS.textSecondary
          }
        />
      </View>

      <Text
        style={[
          styles.roleText,
          selected && styles.roleTextSelected,
        ]}
      >
        {label}
      </Text>

      {selected ? (
        <Ionicons
          name="checkmark-circle"
          size={18}
          color={COLORS.primary}
          style={styles.roleCheck}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleCard: {
    flex: 1,
    minHeight: 104,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  roleCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  roleIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  roleIconSelected: {
    backgroundColor: COLORS.card,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  roleTextSelected: {
    color: COLORS.primary,
  },
  roleCheck: {
    position: 'absolute',
    right: 9,
    top: 9,
  },
  pressed: {
    opacity: 0.76,
  },
});
