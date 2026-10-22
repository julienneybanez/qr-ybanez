import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Props = {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  theme?: 'primary';
  variant?: ButtonVariant;
  onPress: () => void;
  disabled?: boolean;
};

export default function AppButton({ title, icon, theme, variant, onPress, disabled = false }: Props) {
  const resolvedVariant: ButtonVariant = variant ?? (theme === 'primary' ? 'primary' : 'secondary');
  const isPrimary = resolvedVariant === 'primary';
  const isDanger = resolvedVariant === 'danger';
  const iconColor = isPrimary ? COLORS.textOnPrimary : isDanger ? COLORS.danger : COLORS.primary;
  const labelColor = isPrimary ? COLORS.textOnPrimary : isDanger ? COLORS.danger : COLORS.textPrimary;

  return (
    <View style={[styles.wrapper, disabled && styles.disabled]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          isPrimary && styles.primary,
          resolvedVariant === 'secondary' && styles.secondary,
          resolvedVariant === 'ghost' && styles.ghost,
          isDanger && styles.danger,
          pressed && !disabled && styles.pressed,
        ]}
      >
        {icon ? <Ionicons name={icon} size={19} color={iconColor} style={styles.icon} /> : null}
        <Text style={[styles.label, { color: labelColor }, isPrimary && styles.primaryLabel]}>{title}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', marginBottom: 12 },
  button: {
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
  },
  primary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  secondary: { backgroundColor: COLORS.card, borderColor: COLORS.border },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  danger: { backgroundColor: COLORS.dangerSoft, borderColor: '#FFE0E5' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
  icon: { marginRight: 9 },
  label: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  primaryLabel: { fontWeight: '800' },
});
