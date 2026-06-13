import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StackScreenProps } from '@react-navigation/stack';
import type { StudentStackParamList, AIVerificationResult } from '../../types';
import { aiAPI, overrideAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { CyanButton } from '../../components/CyanButton';
import { AIThinkingIndicator } from '../../components/AIThinkingIndicator';
import { ConfidenceScoreBadge } from '../../components/ConfidenceScoreBadge';
import { GlassCard } from '../../components/GlassCard';
import { SafetyWarningBanner } from '../../components/SafetyWarningBanner';

type Props = StackScreenProps<StudentStackParamList, 'ImageVerification'>;

export function ImageVerificationScreen({ route, navigation }: Props) {
  const { sessionId, experimentId, stepNumber, stepDescription, experimentName } = route.params;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<AIVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Instructor bypass state
  const [overrideRequesting, setOverrideRequesting] = useState(false);

  async function handleRequestOverride() {
    setOverrideRequesting(true);
    setError(null);
    try {
      if (imageUri) {
        await AsyncStorage.setItem(`@photo_${sessionId}_${stepNumber}`, imageUri);
      }
      await overrideAPI.request(sessionId, stepNumber, experimentName, imageBase64);
      // Navigate back to session
      navigation.navigate('ExperimentSession', {
        sessionId,
        experimentId,
        isVerified: false,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to request override');
    } finally {
      setOverrideRequesting(false);
    }
  }

  async function pickImage(fromCamera: boolean) {
    setError(null);
    setResult(null);

    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError('Permission denied. Please enable camera/gallery access in device settings.');
      return;
    }

    const picked = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          base64: true,
          quality: 0.3,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          base64: true,
          quality: 0.3,
        });

    if (picked.canceled || !picked.assets || picked.assets.length === 0) return;

    const asset = picked.assets[0];
    setImageUri(asset.uri);
    setImageBase64(asset.base64 ?? null);
  }

  async function handleVerify() {
    if (!imageBase64) return;
    setVerifying(true);
    setError(null);
    setResult(null);

    try {
      const data = await aiAPI.verifyImage(imageBase64, stepDescription, experimentName);
      setResult(data);
      if (data.is_correct && imageUri) {
        await AsyncStorage.setItem(`@photo_${sessionId}_${stepNumber}`, imageUri);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.title}>SETUP VERIFICATION</Text>
          <Text style={styles.subtitle}>AI will analyse your lab setup for this step</Text>
        </View>

        {/* Step context */}
        <GlassCard style={styles.contextCard}>
          <Text style={styles.contextLabel}>VERIFYING STEP</Text>
          <Text style={styles.contextText} numberOfLines={3}>{stepDescription}</Text>
        </GlassCard>

        {/* Image preview */}
        <View style={styles.imageSection}>
          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
              <View style={styles.imageOverlay}>
                <Text style={styles.imageOverlayText}>IMAGE CAPTURED</Text>
              </View>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderIcon}>◻</Text>
              <Text style={styles.placeholderText}>NO IMAGE SELECTED</Text>
              <Text style={styles.placeholderSub}>Capture or select a photo of your lab setup</Text>
            </View>
          )}
        </View>

        {/* Pick buttons */}
        <View style={styles.pickButtons}>
          <CyanButton
            label="CAMERA"
            onPress={() => pickImage(true)}
            variant="ghost"
            disabled={verifying}
            style={styles.pickBtn}
          />
          <CyanButton
            label="GALLERY"
            onPress={() => pickImage(false)}
            variant="ghost"
            disabled={verifying}
            style={styles.pickBtn}
          />
        </View>

        {/* Verify button */}
        <CyanButton
          label="VERIFY SETUP →"
          onPress={handleVerify}
          loading={verifying}
          disabled={!imageBase64 || verifying}
          style={styles.verifyBtn}
        />

        {/* Thinking indicator */}
        {verifying && (
          <View style={styles.thinkingContainer}>
            <AIThinkingIndicator message="Analysing lab setup with AI vision..." />
          </View>
        )}

        {/* Error */}
        {error ? (
          <SafetyWarningBanner message={error} severity="danger" />
        ) : null}

        {/* Verification result */}
        {result && (
          <View style={styles.resultSection}>
            {/* Status header */}
            <View style={styles.resultHeader}>
              <ConfidenceScoreBadge score={result.confidence_score} />
              <View style={[
                styles.statusPill,
                { backgroundColor: result.is_correct ? Colors.successBg : Colors.dangerBg }
              ]}>
                <Text style={[
                  styles.statusPillText,
                  { color: result.is_correct ? Colors.success : Colors.danger }
                ]}>
                  {result.is_correct ? '✓ SETUP CORRECT' : '✗ ISSUES FOUND'}
                </Text>
              </View>
            </View>

            {/* Feedback */}
            <GlassCard>
              <Text style={styles.resultLabel}>AI FEEDBACK</Text>
              <Text style={styles.resultText}>{result.feedback}</Text>
            </GlassCard>

            {/* Issues */}
            {result.issues.length > 0 && (
              <GlassCard>
                <Text style={styles.resultLabel}>ISSUES DETECTED</Text>
                {result.issues.map((issue, i) => (
                  <View key={i} style={styles.issueRow}>
                    <Text style={styles.issueBullet}>△</Text>
                    <Text style={styles.issueText}>{issue}</Text>
                  </View>
                ))}
              </GlassCard>
            )}

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <GlassCard>
                <Text style={styles.resultLabel}>SUGGESTIONS</Text>
                {result.suggestions.map((s, i) => (
                  <View key={i} style={styles.suggRow}>
                    <Text style={styles.suggBullet}>→</Text>
                    <Text style={styles.suggText}>{s}</Text>
                  </View>
                ))}
              </GlassCard>
            )}

            {/* Instructor Override Option if AI checks failed */}
            {!result.is_correct && (
              <GlassCard style={styles.overrideCard}>
                <Text style={styles.overrideTitle}>INSTRUCTOR OVERRIDE</Text>
                <Text style={styles.overrideDesc}>
                  If your setup is correct but AI vision is incorrect, request instructor approval to bypass:
                </Text>
                <CyanButton
                  label={overrideRequesting ? "REQUESTING..." : "REQUEST OVERRIDE"}
                  onPress={handleRequestOverride}
                  loading={overrideRequesting}
                  style={{ marginTop: Spacing.sm }}
                />
              </GlassCard>
            )}

            <CyanButton
              label="← RETURN TO STEP"
              onPress={() => {
                if (result.is_correct) {
                  navigation.navigate('ExperimentSession', {
                    sessionId,
                    experimentId,
                    verifiedStepNumber: stepNumber,
                    isVerified: true,
                  });
                } else {
                  navigation.goBack();
                }
              }}
              style={styles.returnBtn}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.xxxl },
  header: { gap: Spacing.sm },
  backBtn: { marginBottom: -Spacing.sm },
  backText: {
    fontFamily: Typography.fontMono,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.accent,
  },
  title: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 22,
    letterSpacing: 3,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontBody,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  contextCard: { gap: Spacing.xs },
  contextLabel: {
    fontFamily: Typography.fontMono,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.textSecondary,
  },
  contextText: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  imageSection: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    height: 220,
  },
  imageContainer: { flex: 1, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: Spacing.sm,
    alignItems: 'center',
  },
  imageOverlayText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.success,
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  placeholderIcon: {
    fontFamily: Typography.fontMono,
    fontSize: 40,
    color: Colors.textDim,
  },
  placeholderText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.textDim,
  },
  placeholderSub: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textDim,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  pickButtons: { flexDirection: 'row', gap: Spacing.md },
  pickBtn: { flex: 1 },
  verifyBtn: { width: '100%' },
  thinkingContainer: { alignItems: 'center', paddingVertical: Spacing.lg },
  resultSection: { gap: Spacing.lg },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statusPill: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  statusPillText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  resultLabel: {
    fontFamily: Typography.fontMono,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  resultText: {
    fontFamily: Typography.fontBody,
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  issueRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  issueBullet: {
    fontFamily: Typography.fontMono,
    fontSize: 12,
    color: Colors.warning,
    marginTop: 2,
  },
  issueText: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  suggRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  suggBullet: {
    fontFamily: Typography.fontMono,
    fontSize: 12,
    color: Colors.accentDim,
    marginTop: 2,
  },
  suggText: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  returnBtn: { width: '100%' },
  overrideCard: {
    borderColor: Colors.border,
    backgroundColor: 'rgba(255,255,255,0.01)',
    gap: Spacing.xs,
  },
  overrideTitle: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.accent,
  },
  overrideDesc: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  overrideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  pinInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    fontFamily: Typography.fontMono,
    fontSize: 13,
    color: Colors.textPrimary,
    width: 100,
    textAlign: 'center',
  },
  pinErrorText: {
    fontFamily: Typography.fontMono,
    fontSize: 11,
    color: Colors.danger,
  },
});
