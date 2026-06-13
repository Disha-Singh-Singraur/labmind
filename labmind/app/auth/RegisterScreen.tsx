import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import type { AuthStackParamList } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { CyanButton } from '../../components/CyanButton';

type Props = StackScreenProps<AuthStackParamList, 'Register'>;

type Role = 'student' | 'instructor';

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (!fullName.trim()) return 'Full name is required.';
    if (!email.trim() || !email.includes('@')) return 'A valid email address is required.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  }

  async function handleRegister() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register({ email: email.trim(), password, full_name: fullName.trim(), role });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.accentSquare} />
              <Text style={styles.logo}>LABMIND</Text>
            </View>
            <Text style={styles.screenTitle}>CREATE ACCOUNT</Text>
            <Text style={styles.subtitle}>Register your laboratory profile</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={(v) => { setFullName(v); setError(null); }}
                placeholder="Dr. Jane Smith"
                placeholderTextColor={Colors.textDim}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(null); }}
                placeholder="researcher@university.edu"
                placeholderTextColor={Colors.textDim}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(null); }}
                placeholder="Minimum 6 characters"
                placeholderTextColor={Colors.textDim}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); setError(null); }}
                placeholder="Re-enter password"
                placeholderTextColor={Colors.textDim}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            {/* Role toggle */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>ROLE</Text>
              <View style={styles.roleToggle}>
                {(['student', 'instructor'] as Role[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRole(r)}
                    style={[styles.roleOption, role === r && styles.roleOptionActive]}
                    disabled={loading}
                  >
                    <Text style={[styles.roleOptionText, role === r && styles.roleOptionTextActive]}>
                      {r.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>△ {error}</Text>
              </View>
            ) : null}

            <CyanButton label="CREATE ACCOUNT" onPress={handleRegister} loading={loading} style={styles.btn} />

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>
                Have an account?{' '}
                <Text style={styles.link}>SIGN IN →</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  header: { gap: Spacing.sm },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  accentSquare: { width: 6, height: 6, backgroundColor: Colors.accent },
  logo: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 14,
    letterSpacing: 4,
    color: Colors.accent,
  },
  screenTitle: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 24,
    letterSpacing: 3,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontBody,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  form: { gap: Spacing.md },
  fieldGroup: { gap: Spacing.xs },
  label: {
    fontFamily: Typography.fontMono,
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontFamily: Typography.fontBody,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  roleToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  roleOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  roleOptionActive: {
    backgroundColor: Colors.accentGlow,
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
  },
  roleOptionText: {
    fontFamily: Typography.fontMono,
    fontSize: 12,
    letterSpacing: 1.2,
    color: Colors.textDim,
  },
  roleOptionTextActive: {
    color: Colors.accent,
  },
  errorBanner: {
    backgroundColor: Colors.dangerBg,
    borderLeftWidth: 2,
    borderLeftColor: Colors.danger,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  errorText: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: Colors.danger,
  },
  btn: { marginTop: Spacing.sm },
  linkRow: { alignItems: 'center', paddingVertical: Spacing.sm },
  linkText: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  link: {
    fontFamily: Typography.fontMono,
    color: Colors.accent,
    fontSize: 12,
  },
});
