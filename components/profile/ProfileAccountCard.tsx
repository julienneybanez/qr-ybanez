import type { ReactNode } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import type { Profile } from '@/lib/profiles';

type Props = {
  profile: Profile | null;
  fallbackEmail?: string | null;
  editing: boolean;
  draftName: string;
  saving: boolean;
  onDraftNameChange: (value: string) => void;
  onStartEditing: () => void;
  onSaveName: () => void;
};

export default function ProfileAccountCard({
  profile,
  fallbackEmail,
  editing,
  draftName,
  saving,
  onDraftNameChange,
  onStartEditing,
  onSaveName,
}: Props) {
  const isStudent =
    profile?.role === 'student';

  return (
    <>
      <Text style={styles.sectionLabel}>
        Account
      </Text>

      <View style={styles.card}>
        <InfoRow icon="person-outline" label="Name">
          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.nameInput}
                value={draftName}
                onChangeText={onDraftNameChange}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.textSecondary}
                editable={!saving}
              />

              <Pressable
                onPress={onSaveName}
                disabled={saving}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? '...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={onStartEditing}
              style={({ pressed }) => [
                styles.valueRow,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.infoValue}>
                {profile?.full_name ||
                  'Tap to add your name'}
              </Text>

              <Ionicons
                name="create-outline"
                size={18}
                color={COLORS.primary}
              />
            </Pressable>
          )}
        </InfoRow>

        <View style={styles.divider} />

        {isStudent ? (
          <>
            <InfoRow
              icon="card-outline"
              label="Student ID"
            >
              <Text style={styles.infoValue}>
                {profile?.student_id ??
                  'Not assigned'}
              </Text>
            </InfoRow>

            <View style={styles.divider} />
          </>
        ) : null}

        <InfoRow
          icon="mail-outline"
          label="Email"
        >
          <Text style={styles.infoValue}>
            {profile?.email ??
              fallbackEmail ??
              '—'}
          </Text>
        </InfoRow>
      </View>
    </>
  );
}

type InfoRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  children: ReactNode;
};

function InfoRow({
  icon,
  label,
  children,
}: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>
          {label}
        </Text>

        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    alignItems: 'center',
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 3,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 50,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    color: COLORS.textPrimary,
  },
  saveButton: {
    minHeight: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
