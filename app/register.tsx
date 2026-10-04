import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { signUp } from '@/lib/auth';

export default function RegisterScreen() {
  const insets =
    useSafeAreaInsets();

  const [
    fullName,
    setFullName,
  ] = useState('');

  const [role, setRole] =
    useState<
      'student' | 'teacher'
    >('student');

  const [
    studentId,
    setStudentId,
  ] = useState('');

  const [email, setEmail] =
    useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [
    success,
    setSuccess,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const handleRegister =
    async () => {
      setError(null);

      if (
        !fullName.trim() ||
        !email.trim() ||
        !password ||
        !confirmPassword
      ) {
        setError(
          'All fields are required.'
        );
        return;
      }

      if (
        role === 'student' &&
        !studentId.trim()
      ) {
        setError(
          'Student ID is required for student accounts.'
        );
        return;
      }

      if (
        password !==
        confirmPassword
      ) {
        setError(
          'Passwords do not match.'
        );
        return;
      }

      if (
        password.length < 6
      ) {
        setError(
          'Password must be at least 6 characters.'
        );
        return;
      }

      setLoading(true);

      try {
        const {
          data,
          error: authError,
        } = await signUp(
          email.trim(),
          password,
          {
            full_name:
              fullName.trim(),
            role,
            student_id:
              role === 'student'
                ? studentId.trim()
                : null,
          }
        );

        if (authError) {
          const errorMessage =
            authError.message;

          if (
            role === 'student' &&
            errorMessage
              .toLowerCase()
              .includes(
                'database error'
              )
          ) {
            setError(
              'Could not create the student account. Make sure the Student ID is valid and is not already being used.'
            );
          } else {
            setError(
              errorMessage
            );
          }
        } else if (
          !data.session
        ) {
          setSuccess(true);
        }
      } catch {
        setError(
          'An unexpected error occurred. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop:
            insets.top,
        },
      ]}
    >
      <KeyboardAvoidingView
        style={
          styles.keyboardView
        }
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        keyboardVerticalOffset={
          Platform.OS === 'ios'
            ? 0
            : 20
        }
      >
        <TouchableWithoutFeedback
          onPress={
            Keyboard.dismiss
          }
        >
          <ScrollView
            contentContainerStyle={
              styles.scrollContent
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={
              false
            }
          >
            <Header
              title="QR Attendance"
            />

            <View
              style={
                styles.authHeader
              }
            >
              <Text
                style={styles.title}
              >
                Create account
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                Set up your account to get started.
              </Text>
            </View>

            {success ? (
              <View
                style={
                  styles.successCard
                }
              >
                <View
                  style={
                    styles.successIcon
                  }
                >
                  <Ionicons
                    name="mail-unread-outline"
                    size={30}
                    color={
                      COLORS.success
                    }
                  />
                </View>

                <Text
                  style={
                    styles.successTitle
                  }
                >
                  Check your email
                </Text>

                <Text
                  style={
                    styles.successText
                  }
                >
                  We sent a confirmation link to{' '}
                  {email}. Verify your
                  account, then come
                  back and sign in.
                </Text>

                <Link
                  href="/login"
                  style={
                    styles.successLink
                  }
                >
                  Back to Sign In
                </Link>
              </View>
            ) : (
              <>
                <Text
                  style={
                    styles.label
                  }
                >
                  Full name
                </Text>

                <View
                  style={
                    styles.inputShell
                  }
                >
                  <Ionicons
                    name="person-outline"
                    size={19}
                    color={
                      COLORS.textSecondary
                    }
                  />

                  <TextInput
                    style={
                      styles.input
                    }
                    value={
                      fullName
                    }
                    onChangeText={
                      setFullName
                    }
                    placeholder="Enter your full name"
                    placeholderTextColor={
                      COLORS.textSecondary
                    }
                    editable={
                      !loading
                    }
                  />
                </View>

                <Text
                  style={
                    styles.label
                  }
                >
                  I am a...
                </Text>

                <View
                  style={
                    styles.roleRow
                  }
                >
                  <RoleCard
                    label="Student"
                    icon="school-outline"
                    selected={
                      role ===
                      'student'
                    }
                    onPress={() =>
                      setRole(
                        'student'
                      )
                    }
                    disabled={
                      loading
                    }
                  />

                  <RoleCard
                    label="Teacher"
                    icon="people-outline"
                    selected={
                      role ===
                      'teacher'
                    }
                    onPress={() =>
                      setRole(
                        'teacher'
                      )
                    }
                    disabled={
                      loading
                    }
                  />
                </View>

                {role ===
                'student' ? (
                  <>
                    <Text
                      style={
                        styles.label
                      }
                    >
                      Student ID
                    </Text>

                    <View
                      style={
                        styles.inputShell
                      }
                    >
                      <Ionicons
                        name="card-outline"
                        size={19}
                        color={
                          COLORS.textSecondary
                        }
                      />

                      <TextInput
                        style={
                          styles.input
                        }
                        value={
                          studentId
                        }
                        onChangeText={
                          setStudentId
                        }
                        placeholder="Enter your Student ID"
                        placeholderTextColor={
                          COLORS.textSecondary
                        }
                        autoCapitalize="characters"
                        autoCorrect={
                          false
                        }
                        editable={
                          !loading
                        }
                      />
                    </View>

                    <Text
                      style={
                        styles.fieldHint
                      }
                    >
                      Use your actual
                      school-issued
                      Student ID.
                    </Text>
                  </>
                ) : null}

                <Text
                  style={
                    styles.label
                  }
                >
                  Email
                </Text>

                <View
                  style={
                    styles.inputShell
                  }
                >
                  <Ionicons
                    name="mail-outline"
                    size={19}
                    color={
                      COLORS.textSecondary
                    }
                  />

                  <TextInput
                    style={
                      styles.input
                    }
                    value={email}
                    onChangeText={
                      setEmail
                    }
                    placeholder="your.email@school.edu"
                    placeholderTextColor={
                      COLORS.textSecondary
                    }
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={
                      !loading
                    }
                  />
                </View>

                <Text
                  style={
                    styles.label
                  }
                >
                  Password
                </Text>

                <View
                  style={
                    styles.inputShell
                  }
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={19}
                    color={
                      COLORS.textSecondary
                    }
                  />

                  <TextInput
                    style={
                      styles.input
                    }
                    value={
                      password
                    }
                    onChangeText={
                      setPassword
                    }
                    placeholder="At least 6 characters"
                    placeholderTextColor={
                      COLORS.textSecondary
                    }
                    secureTextEntry={
                      !showPassword
                    }
                    editable={
                      !loading
                    }
                  />

                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      setShowPassword(
                        (
                          previous
                        ) =>
                          !previous
                      )
                    }
                    hitSlop={8}
                  >
                    <Ionicons
                      name={
                        showPassword
                          ? 'eye-off-outline'
                          : 'eye-outline'
                      }
                      size={20}
                      color={
                        COLORS.textSecondary
                      }
                    />
                  </Pressable>
                </View>

                <Text
                  style={
                    styles.label
                  }
                >
                  Confirm password
                </Text>

                <View
                  style={
                    styles.inputShell
                  }
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={19}
                    color={
                      COLORS.textSecondary
                    }
                  />

                  <TextInput
                    style={
                      styles.input
                    }
                    value={
                      confirmPassword
                    }
                    onChangeText={
                      setConfirmPassword
                    }
                    placeholder="Re-enter your password"
                    placeholderTextColor={
                      COLORS.textSecondary
                    }
                    secureTextEntry={
                      !showPassword
                    }
                    editable={
                      !loading
                    }
                  />
                </View>

                {error ? (
                  <View
                    style={
                      styles.errorBox
                    }
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={18}
                      color={
                        COLORS.danger
                      }
                    />

                    <Text
                      style={
                        styles.errorText
                      }
                    >
                      {error}
                    </Text>
                  </View>
                ) : null}

                <View
                  style={
                    styles.actionArea
                  }
                >
                  {loading ? (
                    <ActivityIndicator
                      size="large"
                      color={
                        COLORS.primary
                      }
                      style={
                        styles.loader
                      }
                    />
                  ) : (
                    <AppButton
                      theme="primary"
                      title="Create Account"
                      icon="person-add-outline"
                      onPress={
                        handleRegister
                      }
                    />
                  )}
                </View>

                <Text
                  style={
                    styles.footerText
                  }
                >
                  Already have an
                  account?{' '}
                  <Link
                    href="/login"
                    style={
                      styles.link
                    }
                  >
                    Sign In
                  </Link>
                </Text>
              </>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

function RoleCard({
  label,
  icon,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.roleCard,
        selected &&
          styles.roleCardSelected,
        pressed &&
          styles.pressed,
      ]}
    >
      <View
        style={[
          styles.roleIcon,
          selected &&
            styles.roleIconSelected,
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
          selected &&
            styles.roleTextSelected,
        ]}
      >
        {label}
      </Text>

      {selected ? (
        <Ionicons
          name="checkmark-circle"
          size={18}
          color={COLORS.primary}
          style={
            styles.roleCheck
          }
        />
      ) : null}
    </Pressable>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    keyboardView: {
      flex: 1,
    },

    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 10,
      paddingBottom: 36,
    },

    authHeader: {
      marginTop: 22,
      marginBottom: 16,
    },

    title: {
      fontSize: 27,
      fontWeight: '700',
      color:
        COLORS.textPrimary,
    },

    subtitle: {
      marginTop: 5,
      fontSize: 14,
      lineHeight: 20,
      color:
        COLORS.textSecondary,
    },

    label: {
      fontSize: 13,
      fontWeight: '700',
      color:
        COLORS.textPrimary,
      marginBottom: 7,
      marginTop: 13,
    },

    inputShell: {
      minHeight: 52,
      backgroundColor:
        COLORS.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      paddingHorizontal: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    input: {
      flex: 1,
      fontSize: 15,
      color:
        COLORS.textPrimary,
      paddingVertical: 12,
    },

    fieldHint: {
      marginTop: 6,
      fontSize: 11,
      lineHeight: 16,
      color:
        COLORS.textSecondary,
    },

    roleRow: {
      flexDirection: 'row',
      gap: 10,
    },

    roleCard: {
      flex: 1,
      minHeight: 104,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.card,
      alignItems: 'center',
      justifyContent:
        'center',
      position: 'relative',
    },

    roleCardSelected: {
      borderColor:
        COLORS.primary,
      backgroundColor:
        COLORS.primarySoft,
    },

    roleIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        COLORS.surface,
      alignItems: 'center',
      justifyContent:
        'center',
      marginBottom: 8,
    },

    roleIconSelected: {
      backgroundColor:
        COLORS.card,
    },

    roleText: {
      fontSize: 13,
      fontWeight: '700',
      color:
        COLORS.textPrimary,
    },

    roleTextSelected: {
      color:
        COLORS.primary,
    },

    roleCheck: {
      position: 'absolute',
      right: 9,
      top: 9,
    },

    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 14,
      backgroundColor:
        COLORS.dangerSoft,
      borderRadius: 11,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },

    errorText: {
      flex: 1,
      color:
        COLORS.danger,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
    },

    actionArea: {
      marginTop: 20,
    },

    loader: {
      marginVertical: 13,
    },

    footerText: {
      fontSize: 13,
      color:
        COLORS.textSecondary,
      textAlign: 'center',
    },

    link: {
      color:
        COLORS.primary,
      fontWeight: '700',
    },

    successCard: {
      marginTop: 18,
      backgroundColor:
        COLORS.card,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 16,
      padding: 22,
      alignItems: 'center',
    },

    successIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor:
        COLORS.successSoft,
      alignItems: 'center',
      justifyContent:
        'center',
      marginBottom: 14,
    },

    successTitle: {
      fontSize: 19,
      fontWeight: '700',
      color:
        COLORS.textPrimary,
    },

    successText: {
      marginTop: 8,
      marginBottom: 18,
      fontSize: 13,
      lineHeight: 19,
      color:
        COLORS.textSecondary,
      textAlign: 'center',
    },

    successLink: {
      color:
        COLORS.primary,
      fontWeight: '700',
    },

    pressed: {
      opacity: 0.76,
    },
  });