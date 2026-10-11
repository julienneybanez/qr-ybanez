import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  editable: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  passwordVisible?: boolean;
  onTogglePassword?: () => void;
};

export default function AuthInput({
  icon,
  value,
  onChangeText,
  placeholder,
  editable,
  autoCapitalize,
  autoCorrect,
  keyboardType,
  secureTextEntry,
  showPasswordToggle = false,
  passwordVisible = false,
  onTogglePassword,
}: Props) {
  return (
    <View style={styles.inputShell}>
      <Ionicons
        name={icon}
        size={19}
        color={COLORS.textSecondary}
      />

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        editable={editable}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
      />

      {showPasswordToggle ? (
        <Pressable
          accessibilityRole="button"
          onPress={onTogglePassword}
          hitSlop={8}
        >
          <Ionicons
            name={
              passwordVisible
                ? 'eye-off-outline'
                : 'eye-outline'
            }
            size={20}
            color={COLORS.textSecondary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputShell: {
    minHeight: 52,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 12,
  },
});
