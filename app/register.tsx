import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
import AuthInput from '@/components/auth/AuthInput';
import RegistrationSuccessCard from '@/components/auth/RegistrationSuccessCard';
import RoleSelector from '@/components/auth/RoleSelector';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { signUp } from '@/lib/auth';
import type { Role } from '@/lib/profiles';

export default function RegisterScreen() {
  const insets =
    useSafeAreaInsets();

  const [
    fullName,
    setFullName,
  ] = useState('');

  const [role, setRole] =
    useState<Role>('student');

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
    useState<string | null>(null);

  const [success, setSuccess] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const handleRegister = async () => {
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
      password !== confirmPassword
    ) {
      setError(
        'Passwords do not match.'
      );
      return;
    }

    if (password.length < 6) {
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
          setError(errorMessage);
        }
      } else if (!data.session) {
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
          paddingTop: insets.top,
        },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
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
          onPress={Keyboard.dismiss}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Header title="QR Attendance" />

            <View style={styles.authHeader}>
              <Text style={styles.title}>
                Create account
              </Text>

              <Text style={styles.subtitle}>
                Set up your account to get started.
              </Text>
            </View>

            {success ? (
              <RegistrationSuccessCard
                email={email}
              />
            ) : (
              <>
                <Text style={styles.label}>
                  Full name
                </Text>

                <AuthInput
                  icon="person-outline"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  editable={!loading}
                />

                <Text style={styles.label}>
                  I am a...
                </Text>

                <RoleSelector
                  role={role}
                  disabled={loading}
                  onChange={setRole}
                />

                {role === 'student' ? (
                  <>
                    <Text style={styles.label}>
                      Student ID
                    </Text>

                    <AuthInput
                      icon="card-outline"
                      value={studentId}
                      onChangeText={setStudentId}
                      placeholder="Enter your Student ID"
                      autoCapitalize="characters"
                      autoCorrect={false}
                      editable={!loading}
                    />

                    <Text style={styles.fieldHint}>
                      Use your actual school-issued Student ID.
                    </Text>
                  </>
                ) : null}

                <Text style={styles.label}>
                  Email
                </Text>

                <AuthInput
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your.email@school.edu"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />

                <Text style={styles.label}>
                  Password
                </Text>

                <AuthInput
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  secureTextEntry={!showPassword}
                  showPasswordToggle
                  passwordVisible={showPassword}
                  onTogglePassword={() =>
                    setShowPassword(
                      (previous) =>
                        !previous
                    )
                  }
                  editable={!loading}
                />

                <Text style={styles.label}>
                  Confirm password
                </Text>

                <AuthInput
                  icon="shield-checkmark-outline"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />

                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={18}
                      color={COLORS.danger}
                    />

                    <Text style={styles.errorText}>
                      {error}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.actionArea}>
                  {loading ? (
                    <ActivityIndicator
                      size="large"
                      color={COLORS.primary}
                      style={styles.loader}
                    />
                  ) : (
                    <AppButton
                      theme="primary"
                      title="Create Account"
                      icon="person-add-outline"
                      onPress={() => {
                        void handleRegister();
                      }}
                    />
                  )}
                </View>

                <Text style={styles.footerText}>
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    style={styles.link}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 7,
    marginTop: 13,
  },
  fieldHint: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    color: COLORS.danger,
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
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  link: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
