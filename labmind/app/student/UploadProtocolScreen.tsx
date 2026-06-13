import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import type { StackScreenProps } from '@react-navigation/stack';
import type { StudentStackParamList } from '../../types';
import { experimentsAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { CyanButton } from '../../components/CyanButton';
import { AIThinkingIndicator } from '../../components/AIThinkingIndicator';
import { GlassCard } from '../../components/GlassCard';

type Props = StackScreenProps<StudentStackParamList, 'UploadProtocol'>;

export function UploadProtocolScreen({ navigation }: Props) {
  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelectPDF() {
    try {
      setError(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      setSelectedFile({ name: asset.name, uri: asset.uri });
    } catch {
      setError('Failed to select file. Please try again.');
    }
  }

  async function handleParse() {
    if (!selectedFile) return;
    setParsing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: 'application/pdf',
      } as unknown as Blob);

      const experiment = await experimentsAPI.uploadPDF(formData);
      navigation.navigate('ExperimentOverview', { experimentId: experiment.id });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to parse protocol. Please try again.');
    } finally {
      setParsing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.title}>UPLOAD PROTOCOL</Text>
          <Text style={styles.subtitle}>Select a PDF lab protocol to parse with AI</Text>
        </View>

        {/* Upload area */}
        <TouchableOpacity
          style={[styles.uploadArea, selectedFile && styles.uploadAreaActive]}
          onPress={handleSelectPDF}
          disabled={parsing}
          activeOpacity={0.7}
        >
          <View style={styles.uploadIcon}>
            <Text style={styles.uploadIconText}>PDF</Text>
          </View>

          {selectedFile ? (
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={2}>{selectedFile.name}</Text>
              <Text style={styles.fileReady}>READY TO PARSE</Text>
            </View>
          ) : (
            <View style={styles.uploadPrompt}>
              <Text style={styles.uploadMain}>TAP TO SELECT PDF</Text>
              <Text style={styles.uploadSub}>Lab protocols, procedure sheets, experiment guides</Text>
              <Text style={styles.uploadLimit}>Max 10 MB</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Parsing state */}
        {parsing && (
          <GlassCard style={styles.parsingCard}>
            <AIThinkingIndicator message="Extracting protocol structure..." />
            <Text style={styles.parsingNote}>
              AI is parsing your PDF and identifying steps, materials, and safety requirements.
            </Text>
          </GlassCard>
        )}

        {/* Error */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>△ {error}</Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          <CyanButton
            label="SELECT PDF FILE"
            onPress={handleSelectPDF}
            variant="ghost"
            disabled={parsing}
          />
          <CyanButton
            label="PARSE EXPERIMENT →"
            onPress={handleParse}
            loading={parsing}
            disabled={!selectedFile || parsing}
            style={styles.parseBtn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: Spacing.xl, gap: Spacing.xl },
  header: { gap: Spacing.sm },
  backBtn: { marginBottom: Spacing.sm },
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
  uploadArea: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    padding: Spacing.xxxl,
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.card,
    flex: 1,
    justifyContent: 'center',
    maxHeight: 260,
  },
  uploadAreaActive: {
    borderColor: Colors.accentDim,
    backgroundColor: Colors.accentGlow,
  },
  uploadIcon: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  uploadIconText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 12,
    letterSpacing: 2,
    color: Colors.textSecondary,
  },
  fileInfo: { alignItems: 'center', gap: Spacing.sm },
  fileName: {
    fontFamily: Typography.fontBody,
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  fileReady: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.success,
  },
  uploadPrompt: { alignItems: 'center', gap: Spacing.sm },
  uploadMain: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 13,
    letterSpacing: 2,
    color: Colors.textSecondary,
  },
  uploadSub: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textDim,
    textAlign: 'center',
  },
  uploadLimit: {
    fontFamily: Typography.fontMono,
    fontSize: 10,
    color: Colors.textDim,
    letterSpacing: 1,
  },
  parsingCard: { alignItems: 'center', gap: Spacing.md },
  parsingNote: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
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
  actions: { gap: Spacing.md },
  parseBtn: { width: '100%' },
});
