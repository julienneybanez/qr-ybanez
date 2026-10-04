import Ionicons from '@expo/vector-icons/Ionicons';

import {
  useFocusEffect,
} from 'expo-router';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';

import { COLORS } from '@/constants/colors';

import {
  signOut,
  useAuth,
} from '@/lib/auth';

import {
  patchCachedProfile,
  refreshCachedProfile,
  useCachedProfile,
} from '@/lib/profile-cache';

import {
  updateProfile,
} from '@/lib/profiles';

export default function ProfileScreen() {
  const { user } = useAuth();

  const {
    profile,
  } = useCachedProfile(
    user?.id
  );

  const [
    draftName,
    setDraftName,
  ] = useState('');

  const [
    editing,
    setEditing,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    signingOut,
    setSigningOut,
  ] = useState(false);

  useEffect(() => {
    if (editing) {
      return;
    }

    setDraftName(
      profile?.full_name ??
        ''
    );
  }, [
    profile?.full_name,
    editing,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        return;
      }

      void refreshCachedProfile(
        user.id
      );
    }, [user])
  );

  const initials =
    useMemo(() => {
      const value =
        profile?.full_name?.trim() ||
        profile?.email?.trim() ||
        user?.email?.trim() ||
        'U';

      return value
        .charAt(0)
        .toUpperCase();
    }, [
      profile,
      user,
    ]);

  const handleSaveName =
    async () => {
      if (!user) {
        return;
      }

      const nextName =
        draftName.trim();

      if (!nextName) {
        Alert.alert(
          'Name required',
          'Please enter your name.'
        );

        return;
      }

      setSaving(true);

      const { error } =
        await updateProfile(
          user.id,
          {
            full_name:
              nextName,
          }
        );

      setSaving(false);

      if (error) {
        Alert.alert(
          'Error',
          error
        );

        return;
      }

      patchCachedProfile(
        user.id,
        {
          full_name:
            nextName,
        }
      );

      setEditing(false);
    };

  const handleSignOut =
    async () => {
      setSigningOut(true);

      try {
        await signOut();
      } catch (error: any) {
        Alert.alert(
          'Error',

          error?.message ||
            'Failed to sign out.'
        );
      } finally {
        setSigningOut(false);
      }
    };

  const isStudent =
    profile?.role ===
    'student';

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
      edges={['top']}
    >
      <ScrollView
        style={
          styles.container
        }
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={styles.title}
        >
          My Profile
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Manage your account information.
        </Text>

        <View
          style={
            styles.profileHeader
          }
        >
          <View
            style={
              styles.avatar
            }
          >
            <Text
              style={
                styles.avatarText
              }
            >
              {initials}
            </Text>
          </View>

          <Text
            style={
              styles.profileName
            }
          >
            {profile?.full_name ||
              'Your name'}
          </Text>

          <View
            style={
              styles.roleBadge
            }
          >
            <Text
              style={
                styles.roleBadgeText
              }
            >
              {profile?.role ===
              'teacher'
                ? 'Teacher'
                : 'Student'}
            </Text>
          </View>
        </View>

        <Text
          style={
            styles.sectionLabel
          }
        >
          Account
        </Text>

        <View
          style={styles.card}
        >
          <View
            style={
              styles.infoRow
            }
          >
            <View
              style={
                styles.infoIcon
              }
            >
              <Ionicons
                name="person-outline"
                size={19}
                color={
                  COLORS.primary
                }
              />
            </View>

            <View
              style={
                styles.infoContent
              }
            >
              <Text
                style={
                  styles.infoLabel
                }
              >
                Name
              </Text>

              {editing ? (
                <View
                  style={
                    styles.editRow
                  }
                >
                  <TextInput
                    style={
                      styles.nameInput
                    }
                    value={
                      draftName
                    }
                    onChangeText={
                      setDraftName
                    }
                    placeholder="Enter your name"
                    placeholderTextColor={
                      COLORS.textSecondary
                    }
                    editable={
                      !saving
                    }
                  />

                  <Pressable
                    onPress={
                      handleSaveName
                    }
                    disabled={
                      saving
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.saveButton,

                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <Text
                      style={
                        styles.saveButtonText
                      }
                    >
                      {saving
                        ? '...'
                        : 'Save'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() =>
                    setEditing(
                      true
                    )
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.valueRow,

                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <Text
                    style={
                      styles.infoValue
                    }
                  >
                    {profile?.full_name ||
                      'Tap to add your name'}
                  </Text>

                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={
                      COLORS.primary
                    }
                  />
                </Pressable>
              )}
            </View>
          </View>

          <View
            style={
              styles.divider
            }
          />

          {isStudent ? (
            <>
              <View
                style={
                  styles.infoRow
                }
              >
                <View
                  style={
                    styles.infoIcon
                  }
                >
                  <Ionicons
                    name="card-outline"
                    size={19}
                    color={
                      COLORS.primary
                    }
                  />
                </View>

                <View
                  style={
                    styles.infoContent
                  }
                >
                  <Text
                    style={
                      styles.infoLabel
                    }
                  >
                    Student ID
                  </Text>

                  <Text
                    style={
                      styles.infoValue
                    }
                  >
                    {profile?.student_id ??
                      'Not assigned'}
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.divider
                }
              />
            </>
          ) : null}

          <View
            style={
              styles.infoRow
            }
          >
            <View
              style={
                styles.infoIcon
              }
            >
              <Ionicons
                name="mail-outline"
                size={19}
                color={
                  COLORS.primary
                }
              />
            </View>

            <View
              style={
                styles.infoContent
              }
            >
              <Text
                style={
                  styles.infoLabel
                }
              >
                Email
              </Text>

              <Text
                style={
                  styles.infoValue
                }
              >
                {profile?.email ??
                  user?.email ??
                  '—'}
              </Text>
            </View>
          </View>
        </View>

        <Text
          style={
            styles.sectionLabel
          }
        >
          System Account ID
        </Text>

        <View
          style={
            styles.idCard
          }
        >
          <Ionicons
            name="finger-print-outline"
            size={19}
            color={
              COLORS.textSecondary
            }
          />

          <Text
            style={
              styles.userId
            }
            numberOfLines={1}
          >
            {user?.id ?? '—'}
          </Text>
        </View>

        <View
          style={
            styles.signOutSection
          }
        >
          <AppButton
            variant="danger"
            title={
              signingOut
                ? 'Signing Out...'
                : 'Sign Out'
            }
            icon="log-out-outline"
            onPress={
              handleSignOut
            }
            disabled={
              signingOut
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },

    container: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },

    content: {
      paddingHorizontal: 20,

      paddingTop: 12,

      paddingBottom: 30,
    },

    title: {
      fontSize: 24,

      fontWeight: '700',

      color:
        COLORS.textPrimary,
    },

    subtitle: {
      marginTop: 4,

      fontSize: 13,

      color:
        COLORS.textSecondary,
    },

    profileHeader: {
      alignItems: 'center',

      paddingVertical: 26,
    },

    avatar: {
      width: 76,

      height: 76,

      borderRadius: 38,

      backgroundColor:
        COLORS.primarySoft,

      alignItems: 'center',

      justifyContent:
        'center',

      marginBottom: 12,
    },

    avatarText: {
      color:
        COLORS.primary,

      fontSize: 28,

      fontWeight: '700',
    },

    profileName: {
      fontSize: 19,

      fontWeight: '700',

      color:
        COLORS.textPrimary,

      textAlign: 'center',
    },

    roleBadge: {
      marginTop: 8,

      borderRadius: 999,

      backgroundColor:
        COLORS.surface,

      paddingHorizontal: 11,

      paddingVertical: 5,
    },

    roleBadgeText: {
      fontSize: 11,

      fontWeight: '700',

      color:
        COLORS.textSecondary,
    },

    sectionLabel: {
      marginBottom: 8,

      fontSize: 12,

      fontWeight: '700',

      color:
        COLORS.textSecondary,

      textTransform:
        'uppercase',

      letterSpacing: 0.7,
    },

    card: {
      backgroundColor:
        COLORS.card,

      borderWidth: 1,

      borderColor:
        COLORS.border,

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

      backgroundColor:
        COLORS.primarySoft,

      alignItems: 'center',

      justifyContent:
        'center',

      marginRight: 12,
    },

    infoContent: {
      flex: 1,
    },

    infoLabel: {
      fontSize: 11,

      color:
        COLORS.textSecondary,

      marginBottom: 3,
    },

    infoValue: {
      flex: 1,

      fontSize: 14,

      fontWeight: '600',

      color:
        COLORS.textPrimary,
    },

    divider: {
      height: 1,

      backgroundColor:
        COLORS.border,

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

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.background,

      paddingHorizontal: 10,

      color:
        COLORS.textPrimary,
    },

    saveButton: {
      minHeight: 40,

      borderRadius: 10,

      paddingHorizontal: 12,

      alignItems: 'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.primary,
    },

    saveButtonText: {
      color:
        COLORS.textOnPrimary,

      fontSize: 12,

      fontWeight: '700',
    },

    idCard: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 10,

      backgroundColor:
        COLORS.surface,

      borderRadius: 12,

      paddingHorizontal: 14,

      paddingVertical: 12,
    },

    userId: {
      flex: 1,

      color:
        COLORS.textSecondary,

      fontSize: 11,
    },

    signOutSection: {
      marginTop: 24,
    },

    pressed: {
      opacity: 0.75,
    },
  });