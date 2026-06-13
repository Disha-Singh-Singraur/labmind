import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import { labSessionAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import type { StudentStackParamList } from '../../types';

type Props = StackScreenProps<StudentStackParamList, 'JoinSession'>;

export function JoinSessionScreen({ navigation }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length === 0) { setError('Enter a session code'); return; }
    if (trimmed.length !== 6) { setError('Session code must be 6 characters'); return; }

    setLoading(true);
    setError(null);
    try {
      const result = await labSessionAPI.join(trimmed);

      // Navigate to ExperimentOverview with the session's experiment
      // If already enrolled and already has an experiment session, go directly there
      if (result.experiment_session_id) {
        navigation.replace('ExperimentSession', {
          sessionId: result.experiment_session_id,
          experimentId: result.experiment_id,
          labEnrollmentId: result.enrollment_id,
        });
      } else {
        // Go to experiment overview so student can start the assigned experiment
        navigation.replace('ExperimentOverview', {
          experimentId: result.experiment_id,
          labEnrollmentId: result.enrollment_id,
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to join session';
      if (msg.includes('404') || msg.toLowerCase().includes('invalid')) {
        setError('Invalid session code. Check with your instructor.');
      } else if (msg.toLowerCase().includes('closed')) {
        setError('This session is closed. Ask your instructor to reopen it.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (val: string) => {
    const cleaned = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
    setCode(cleaned);
    if (error) setError(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← BACK</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.titleLabel}>LAB SESSION</Text>
            <Text style={styles.title}>JOIN SESSION</Text>
            <Text style={styles.subtitle}>
              Enter the 6-character code displayed by your instructor
            </Text>
          </View>

          {/* Code input */}
          <View style={styles.codeSection}>
            <TextInput
              ref={inputRef}
              style={[styles.codeInput, error ? styles.codeInputError : code.length === 6 ? styles.codeInputValid : null]}
              value={code}
              onChangeText={handleCodeChange}
              placeholder="ABC123"
              placeholderTextColor={Colors.textDim}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              keyboardType="default"
              returnKeyType="join"
              onSubmitEditing={handleJoin}
              autoFocus
            />
            <Text style={styles.codeHint}>
              {code.length}/6 characters{code.length === 6 ? ' ✓' : ''}
            </Text>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>△ {error}</Text>
            </View>
          )}

          {/* Join button */}
          <TouchableOpacity
            style={[styles.joinBtn, (loading || code.length < 6) && styles.joinBtnDisabled]}
            onPress={handleJoin}
            disabled={loading || code.length < 6}
          >
            {loading
              ? <ActivityIndicator color={Colors.accent} size="small" />
              : <Text style={styles.joinBtnText}>JOIN SESSION →</Text>
            }
          </TouchableOpacity>

          {/* Info note */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Once you join, the experiment assigned by your instructor will open automatically.
              You can then proceed step by step — your instructor can monitor your progress in real time.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080C14' },
  scroll: {
    flexGrow: 1,
    padding: Spacing.xl,
    gap: Spacing.xl,
    paddingBottom: 48,
  },

  backBtn: { paddingVertical: 4, alignSelf: 'flex-start' },
  backText: { fontFamily: Typography.fontMonoBold, fontSize: 10, letterSpacing: 1, color: Colors.accent },

  headerSection: { gap: Spacing.sm, marginTop: Spacing.md },
  titleLabel: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 10,
    letterSpacing: 3,
    color: Colors.textSecondary,
  },
  title: {
    fontFamily: Typography.fontHeading,
    fontSize: 30,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: Typography.fontBody,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Code input section
  codeSection: { gap: Spacing.sm, alignItems: 'center' },
  codeInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    borderRadius: BorderRadius.md,
    backgroundColor: '#0d1117',
    color: Colors.textPrimary,
    fontFamily: Typography.fontMonoBold,
    fontSize: 40,
    letterSpacing: 16,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  codeInputError: { borderColor: Colors.danger },
  codeInputValid: { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  codeHint: {
    fontFamily: Typography.fontMono,
    fontSize: 10,
    color: Colors.textDim,
    letterSpacing: 0.5,
  },

  // Error
  errorBox: {
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dangerBg,
    padding: Spacing.md,
  },
  errorText: { fontFamily: Typography.fontBody, fontSize: 13, color: Colors.danger },

  // Join button
  joinBtn: {
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: Colors.accentGlow,
  },
  joinBtnDisabled: { opacity: 0.35 },
  joinBtnText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 14,
    letterSpacing: 3,
    color: Colors.accent,
  },

  // Info note
  infoBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  infoText: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textDim,
    lineHeight: 18,
  },
});
