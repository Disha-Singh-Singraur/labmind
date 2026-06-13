import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { StudentStackParamList, Experiment, ExperimentSession } from '../../types';
import { experimentsAPI, sessionsAPI, labSessionAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { GlassCard } from '../../components/GlassCard';
import { CyanButton } from '../../components/CyanButton';
import { SafetyWarningBanner } from '../../components/SafetyWarningBanner';

type Props = StackScreenProps<StudentStackParamList, 'ExperimentOverview'>;

export function ExperimentOverviewScreen({ route, navigation }: Props) {
  const { experimentId, labEnrollmentId } = route.params;
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [activeSession, setActiveSession] = useState<ExperimentSession | null>(null);
  const [labSession, setLabSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useFocusEffect re-runs every time this screen comes into focus
  // (e.g. when pressing back from ExperimentSessionScreen)
  // so the resume step number is always current
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        try {
          const [data, session, activeLabRes] = await Promise.all([
            experimentsAPI.getById(experimentId),
            sessionsAPI.getActiveSession(experimentId),
            labSessionAPI.getMyActive().catch(() => ({ active_session: null, active_sessions: [] })),
          ]);
          if (!cancelled) {
            setExperiment(data);
            setActiveSession(session);
            const matched = (activeLabRes?.active_sessions || []).find(
              (s: any) => s.experiment_id === experimentId
            );
            if (matched) {
              setLabSession(matched);
            } else {
              setLabSession(null);
            }
          }
        } catch (e: unknown) {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load experiment');
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      load();
      return () => { cancelled = true; };
    }, [experimentId]),
  );

  async function handleBegin() {
    if (!experiment) return;

    // If there's already an active session, ask the student what to do
    if (activeSession) {
      Alert.alert(
        'Session In Progress',
        `You have an active session for this experiment at Step ${activeSession.current_step_number}. Would you like to resume it or start fresh?`,
        [
          {
            text: 'Resume',
            onPress: () => handleResume(),
          },
          {
            text: 'Start Fresh',
            style: 'destructive',
            onPress: () => { startFresh(); },
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    // No existing session — start directly
    await doStart(false);
  }

  async function doStart(force: boolean) {
    if (!experiment) return;
    setStarting(true);
    try {
      const session = await sessionsAPI.start(experiment.id, force);
      if (labEnrollmentId) {
        try {
          await labSessionAPI.linkExperimentSession(labEnrollmentId, session.id);
        } catch (linkErr) {
          console.warn('Failed to link experiment session to lab session:', linkErr);
        }
      }
      navigation.navigate('ExperimentSession', {
        sessionId: session.id,
        experimentId: experiment.id,
        labEnrollmentId,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start session');
    } finally {
      setStarting(false);
    }
  }

  async function startFresh() {
    await doStart(true);
  }

  function handleResume() {
    if (!activeSession || !experiment) return;
    navigation.navigate('ExperimentSession', {
      sessionId: activeSession.id,
      experimentId: experiment.id,
      labEnrollmentId,
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerState}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !experiment) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerState}>
          <Text style={styles.errorText}>△ {error ?? 'Experiment not found'}</Text>
          <CyanButton label="← GO BACK" onPress={() => navigation.goBack()} variant="ghost" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>

        {/* Experiment name */}
        <View style={styles.nameSection}>
          <Text style={styles.label}>PROTOCOL</Text>
          <Text style={styles.name}>{experiment.name}</Text>
          {labSession && (
            <View style={styles.sessionMetaBar}>
              <Text style={styles.sessionMetaText}>
                INSTRUCTOR: <Text style={styles.sessionMetaVal}>{labSession.instructor_name || 'Unknown'}</Text>  ·  STUDENTS: <Text style={styles.sessionMetaVal}>{labSession.student_count || 1}</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Objective */}
        <GlassCard>
          <Text style={styles.sectionTitle}>OBJECTIVE</Text>
          <Text style={styles.body}>{experiment.objective}</Text>
        </GlassCard>

        {/* Materials */}
        <GlassCard>
          <Text style={styles.sectionTitle}>MATERIALS · {experiment.materials.length} ITEMS</Text>
          <View style={styles.listContainer}>
            {experiment.materials.map((m, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.listBullet}>—</Text>
                <Text style={styles.listText}>{m}</Text>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Safety notes */}
        {experiment.safety_notes.length > 0 && (
          <View style={styles.safetySection}>
            <Text style={styles.label}>SAFETY REQUIREMENTS</Text>
            <View style={styles.safetyList}>
              {experiment.safety_notes.map((note, i) => (
                <SafetyWarningBanner
                  key={i}
                  message={note}
                  severity={note.toLowerCase().includes('burn') || note.toLowerCase().includes('corros') ? 'danger' : 'warning'}
                />
              ))}
            </View>
          </View>
        )}

        {/* Steps preview */}
        <GlassCard>
          <Text style={styles.sectionTitle}>PROTOCOL STEPS · {experiment.steps.length} TOTAL</Text>
          <View style={styles.stepsPreview}>
            {experiment.steps.map((step) => (
              <View key={step.id} style={styles.stepPreviewRow}>
                <Text style={styles.stepPreviewNum}>
                  {String(step.step_number).padStart(2, '0')}
                </Text>
                <Text style={styles.stepPreviewTitle}>{step.title}</Text>
                {step.checkpoint_required && (
                  <View style={styles.checkpointBadge}>
                    <Text style={styles.checkpointText}>CHK</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Begin / Resume button */}
        <CyanButton
          label={activeSession ? `RESUME EXPERIMENT (STEP ${activeSession.current_step_number}) →` : 'BEGIN EXPERIMENT →'}
          onPress={handleBegin}
          loading={starting}
          style={styles.beginBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.xxxl },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    padding: Spacing.xl,
  },
  backBtn: { marginBottom: -Spacing.sm },
  backText: {
    fontFamily: Typography.fontMono,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.accent,
  },
  nameSection: { gap: Spacing.xs },
  label: {
    fontFamily: Typography.fontMono,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.textSecondary,
  },
  name: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 20,
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  sectionTitle: {
    fontFamily: Typography.fontMono,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  body: {
    fontFamily: Typography.fontBody,
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  listContainer: { gap: Spacing.sm },
  listItem: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  listBullet: {
    fontFamily: Typography.fontMono,
    fontSize: 14,
    color: Colors.accentDim,
    marginTop: 2,
  },
  listText: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  safetySection: { gap: Spacing.md },
  safetyList: { gap: Spacing.sm },
  stepsPreview: { gap: Spacing.sm },
  stepPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stepPreviewNum: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 12,
    color: Colors.accentDim,
    width: 24,
  },
  stepPreviewTitle: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
  },
  checkpointBadge: {
    backgroundColor: Colors.accentGlow,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  checkpointText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 8,
    letterSpacing: 1,
    color: Colors.accent,
  },
  beginBtn: { width: '100%' },
  sessionActions: { gap: Spacing.sm },
  resumeCard: { gap: Spacing.xs },
  resumeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  resumeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  resumeLabel: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.success,
  },
  resumeStep: {
    fontFamily: Typography.fontBody,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  errorText: {
    fontFamily: Typography.fontBody,
    fontSize: 14,
    color: Colors.danger,
    textAlign: 'center',
  },
  sessionMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  sessionMetaText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: Colors.textDim,
  },
  sessionMetaVal: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
