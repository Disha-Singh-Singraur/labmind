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

type Props = StackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      // Navigation is automatic via AuthContext → AppNavigator
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed. Please try again.');
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
            <Text style={styles.screenTitle}>SIGN IN</Text>
            <Text style={styles.subtitle}>Access your laboratory workspace</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
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
                placeholder="••••••••"
                placeholderTextColor={Colors.textDim}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>△ {error}</Text>
              </View>
            ) : null}

            <CyanButton label="SIGN IN" onPress={handleLogin} loading={loading} style={styles.btn} />

            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              disabled={loading}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>
                No account?{' '}
                <Text style={styles.link}>CREATE ONE →</Text>
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
    justifyContent: 'center',
    gap: Spacing.xxxl,
  },
  header: { gap: Spacing.sm },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  accentSquare: { width: 6, height: 6, backgroundColor: Colors.accent },
  logo: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 14,
    letterSpacing: 4,
    color: Colors.accent,
  },
  screenTitle: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 28,
    letterSpacing: 4,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontBody,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  form: { gap: Spacing.lg },
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
