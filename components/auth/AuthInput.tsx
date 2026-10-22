import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';
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

export default function AuthInput(props: Props) {
  return (
    <View style={styles.inputShell}>
      <View style={styles.iconTile}>
        <Ionicons name={props.icon} size={18} color={COLORS.primary} />
      </View>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="#98A3BB"
        editable={props.editable}
        autoCapitalize={props.autoCapitalize}
        autoCorrect={props.autoCorrect}
        keyboardType={props.keyboardType}
        secureTextEntry={props.secureTextEntry}
      />
      {props.showPasswordToggle ? (
        <Pressable accessibilityRole="button" onPress={props.onTogglePassword} hitSlop={8}>
          <Ionicons name={props.passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputShell: { minHeight: 54, backgroundColor: '#F8FAFD', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  iconTile: { width: 34, height: 34, borderRadius: 11, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 12 },
});
