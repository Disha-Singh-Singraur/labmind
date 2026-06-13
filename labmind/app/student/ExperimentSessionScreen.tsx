import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import type { StudentStackParamList, Experiment, ExperimentSession } from '../../types';
import { experimentsAPI, sessionsAPI, overrideAPI, labSessionAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { SafetyWarningBanner } from '../../components/SafetyWarningBanner';
import { CyanButton } from '../../components/CyanButton';
import { GlassCard } from '../../components/GlassCard';

type Props = StackScreenProps<StudentStackParamList, 'ExperimentSession'>;

export function ExperimentSessionScreen({ route, navigation }: Props) {
  const { sessionId, experimentId, verifiedStepNumber, isVerified } = route.params;

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [session, setSession] = useState<ExperimentSession | null>(null);
  const [labSession, setLabSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verification state & instructor override state
  const [checkpointVerified, setCheckpointVerified] = useState(false);
  const [verificationType, setVerificationType] = useState<'ai' | 'instructor' | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<'idle' | 'pending' | 'approved' | 'rejected'>('idle');
  const [requestingOverride, setRequestingOverride] = useState(false);

  const load = useCallback(async () => {
    try {
      const [exp, sess, activeLabRes] = await Promise.all([
        experimentsAPI.getById(experimentId),
        sessionsAPI.getById(sessionId),
        labSessionAPI.getMyActive().catch(() => ({ active_session: null, active_sessions: [] })),
      ]);
      setExperiment(exp);
      setSession(sess);
      const matched = (activeLabRes?.active_sessions || []).find(
        (s: any) => s.experiment_id === experimentId
      );
      if (matched) {
        setLabSession(matched);
      } else {
        setLabSession(null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [experimentId, sessionId]);

  useEffect(() => { load(); }, [load]);

  // Sync checkpoint verification parameter passed back from verification screen
  useEffect(() => {
    if (isVerified && verifiedStepNumber === session?.current_step_number) {
      setCheckpointVerified(true);
      setVerificationType('ai');
      setError(null);
    }
  }, [isVerified, verifiedStepNumber, session?.current_step_number]);

  // Reset verification states when moving to a new step
  useEffect(() => {
    setCheckpointVerified(false);
    setVerificationType(null);
    setOverrideStatus('idle');

    if (experiment && session) {
      const currentStep = experiment.steps.find(
        (s) => s.step_number === session.current_step_number
      );
      if (currentStep && !currentStep.checkpoint_required) {
        setCheckpointVerified(true);
      }
    }
  }, [session?.current_step_number, experiment]);

  // Initial and on-mount override status check
  useEffect(() => {
    if (!session || !experiment) return;
    const currentExp = experiment;
    const currentSess = session;
    const stepNum = currentSess.current_step_number;
    let active = true;

    async function checkInitial() {
      try {
        const currentStep = currentExp.steps.find(s => s.step_number === stepNum);
        if (!currentStep || !currentStep.checkpoint_required) return;

        const res = await overrideAPI.checkStatus(currentSess.id, stepNum);
        if (active) {
          setOverrideStatus(res.status as any);
          if (res.status === 'approved') {
            setCheckpointVerified(true);
            setVerificationType('instructor');
          }
        }
      } catch (e) {
        if (active) {
          setOverrideStatus('idle');
        }
      }
    }

    checkInitial();

    return () => {
      active = false;
    };
  }, [session?.current_step_number, experiment]);

  // Poll override status every 5 seconds when pending
  useEffect(() => {
    if (overrideStatus !== 'pending' || !session) return;
    const currentSess = session;
    const stepNum = currentSess.current_step_number;

    const interval = setInterval(async () => {
      try {
        const res = await overrideAPI.checkStatus(currentSess.id, stepNum);
        if (res.status === 'approved') {
          setCheckpointVerified(true);
          setVerificationType('instructor');
          setOverrideStatus('approved');
          clearInterval(interval);
        } else if (res.status === 'rejected') {
          setOverrideStatus('rejected');
          clearInterval(interval);
        }
      } catch (e) {
        // Ignore errors during polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [overrideStatus, session?.current_step_number]);

  async function handleRequestOverride() {
    if (!session || !experiment) return;
    setRequestingOverride(true);
    setError(null);
    try {
      await overrideAPI.request(session.id, session.current_step_number, experiment.name);
      setOverrideStatus('pending');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to request override');
    } finally {
      setRequestingOverride(false);
    }
  }

  function handleCancelOverrideRequest() {
    setOverrideStatus('idle');
  }

  async function handleCompleteStep() {
    if (!session || !experiment) return;

    // Check if checkpoint is required but not verified yet
    const currentStep = experiment.steps.find(
      (s) => s.step_number === session.current_step_number,
    );
    if (currentStep?.checkpoint_required && !checkpointVerified) {
      setError('Checkpoint verification required. Upload a photo or request instructor override to proceed.');
      return;
    }

    setCompleting(true);
    setError(null);
    try {
      const totalSteps = experiment.steps.length;
      const nextStep = session.current_step_number + 1;

      if (nextStep > totalSteps) {
        // Last step — complete session and go to results
        await sessionsAPI.complete(session.id);
        navigation.navigate('Results', { sessionId: session.id, experimentId: experiment.id });
      } else {
        const updated = await sessionsAPI.updateStep(session.id, nextStep);
        setSession(updated);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update step');
    } finally {
      setCompleting(false);
    }
  }

  function handleUploadPhoto() {
    if (!session || !experiment) return;
    const currentStep = experiment.steps.find(
      (s) => s.step_number === session.current_step_number,
    );
    if (!currentStep) return;
    navigation.navigate('ImageVerification', {
      sessionId: session.id,
      experimentId: experiment.id,
      stepId: currentStep.id,
      stepNumber: currentStep.step_number,
      stepDescription: currentStep.description,
      experimentName: experiment.name,
    });
  }

  function handleAskAI() {
    if (!session || !experiment) return;
    const currentStep = experiment.steps.find(
      (s) => s.step_number === session.current_step_number,
    );
    navigation.navigate('AIChat', {
      sessionId: session.id,
      experimentId: experiment.id,
      currentStepTitle: currentStep?.title ?? 'Current Step',
      experimentName: experiment.name,
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !experiment || !session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>△ {error ?? 'Session not found'}</Text>
          <CyanButton label="← BACK" onPress={() => navigation.goBack()} variant="ghost" />
        </View>
      </SafeAreaView>
    );
  }

  const totalSteps = experiment.steps.length;
  const currentStepNum = session.current_step_number;
  const progressPercent = ((currentStepNum - 1) / totalSteps) * 100;
  const currentStep = experiment.steps.find((s) => s.step_number === currentStepNum);
  const isLastStep = currentStepNum === totalSteps;
  const isLocked = currentStep?.checkpoint_required && !checkpointVerified;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Progress bar — very top */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Step counter */}
        <View style={styles.header}>
          <Text style={styles.stepCounter}>
            STEP {String(currentStepNum).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
          </Text>
          <Text style={styles.expName} numberOfLines={1}>{experiment.name}</Text>
          {labSession && (
            <View style={styles.sessionMetaBar}>
              <Text style={styles.sessionMetaText}>
                INSTRUCTOR: <Text style={styles.sessionMetaVal}>{labSession.instructor_name || 'Unknown'}</Text>  ·  STUDENTS: <Text style={styles.sessionMetaVal}>{labSession.student_count || 1}</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Step content */}
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>{currentStep?.title ?? '—'}</Text>
          <Text style={styles.stepDescription}>{currentStep?.description ?? ''}</Text>
        </View>

        {/* Why card box */}
        {currentStep?.why && (
          <GlassCard style={styles.whyCard}>
            <Text style={styles.whyLabel}>❓ WHY DO WE DO THIS?</Text>
            <Text style={styles.whyText}>{currentStep.why}</Text>
          </GlassCard>
        )}

        {/* Safety warning */}
        {currentStep?.safety_warning && (
          <SafetyWarningBanner
            message={currentStep.safety_warning}
            severity={currentStep.safety_warning.toLowerCase().includes('burn') ||
              currentStep.safety_warning.toLowerCase().includes('corros') ? 'danger' : 'warning'}
          />
        )}

        {/* Checkpoint indicator */}
        {currentStep?.checkpoint_required && (
          <GlassCard style={[
            styles.checkpointCard,
            checkpointVerified && (verificationType === 'instructor' ? styles.checkpointOverriddenCard : styles.checkpointVerifiedCard)
          ]}>
            <Text style={[
              styles.checkpointLabel,
              checkpointVerified && (verificationType === 'instructor' ? styles.checkpointOverriddenLabel : styles.checkpointVerifiedLabel)
            ]}>
              {checkpointVerified
                ? (verificationType === 'instructor' ? '✓ OVERRIDDEN BY INSTRUCTOR' : '✓ VERIFIED BY AI')
                : '⚑ CHECKPOINT REQUIRED'}
            </Text>
            <Text style={styles.checkpointDesc}>
              {checkpointVerified 
                ? 'This step is verified. You can now proceed.' 
                : 'This step requires photo verification before proceeding.'}
            </Text>

            {/* Instructor Override when locked */}
            {isLocked && (
              <View style={styles.overrideContainer}>
                {overrideStatus === 'idle' && (
                  <>
                    <Text style={styles.overrideHint}>Stuck? Request instructor approval to bypass:</Text>
                    <CyanButton
                      label={requestingOverride ? "REQUESTING..." : "REQUEST INSTRUCTOR OVERRIDE"}
                      onPress={handleRequestOverride}
                      loading={requestingOverride}
                      style={{ marginTop: Spacing.sm }}
                    />
                  </>
                )}
                {overrideStatus === 'pending' && (
                  <>
                    <View style={styles.pendingRow}>
                      <ActivityIndicator color={Colors.purple} size="small" style={{ marginRight: Spacing.sm }} />
                      <Text style={[styles.overrideHint, { color: Colors.purple, fontFamily: Typography.fontMonoBold, flex: 1 }]}>
                        WAITING FOR INSTRUCTOR APPROVAL...
                      </Text>
                    </View>
                    <CyanButton
                      label="CANCEL REQUEST"
                      onPress={handleCancelOverrideRequest}
                      variant="ghost"
                      style={{ marginTop: Spacing.sm }}
                    />
                  </>
                )}
                {overrideStatus === 'rejected' && (
                  <>
                    <Text style={[styles.overrideHint, { color: Colors.danger, marginBottom: Spacing.xs }]}>
                      Request rejected by instructor. Please check your setup.
                    </Text>
                    <CyanButton
                      label={requestingOverride ? "REQUESTING..." : "REQUEST OVERRIDE AGAIN"}
                      onPress={handleRequestOverride}
                      loading={requestingOverride}
                    />
                  </>
                )}
              </View>
            )}
          </GlassCard>
        )}

        {/* Previous steps summary */}
        {currentStepNum > 1 && (
          <GlassCard style={styles.prevStepsCard}>
            <Text style={styles.prevStepsLabel}>COMPLETED</Text>
            {experiment.steps
              .filter((s) => s.step_number < currentStepNum)
              .map((s) => (
                <View key={s.id} style={styles.prevStepRow}>
                  <Text style={styles.prevStepNum}>{String(s.step_number).padStart(2, '0')}</Text>
                  <Text style={styles.prevStepTitle}>{s.title}</Text>
                  <Text style={styles.prevStepDone}>✓</Text>
                </View>
              ))}
          </GlassCard>
        )}
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionBtn, isLocked && styles.actionBtnLocked]} 
          onPress={handleCompleteStep} 
          disabled={completing}
        >
          {completing ? (
            <Text style={styles.actionBtnText}>...</Text>
          ) : (
            <Text style={[styles.actionBtnText, isLocked && styles.actionBtnTextLocked]}>
              {isLocked ? 'LOCKED' : (isLastStep ? 'FINISH' : 'COMPLETE')}
            </Text>
          )}
        </TouchableOpacity>

        {currentStep?.checkpoint_required && (
          <TouchableOpacity style={styles.actionBtn} onPress={handleUploadPhoto}>
            <Text style={styles.actionBtnText}>PHOTO</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnAccent]}
          onPress={handleAskAI}
        >
          <Text style={[styles.actionBtnText, styles.actionBtnTextAccent]}>ASK AI</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  progressTrack: {
    height: 2,
    backgroundColor: Colors.surface,
    width: '100%',
  },
  progressFill: {
    height: 2,
    backgroundColor: Colors.accent,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    padding: Spacing.xl,
  },
  scroll: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: 120 },
  header: { gap: Spacing.xs },
  stepCounter: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 13,
    letterSpacing: 3,
    color: Colors.accent,
  },
  expName: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  stepContent: { gap: Spacing.md },
  stepTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: 24,
    color: Colors.textPrimary,
    lineHeight: 32,
  },
  stepDescription: {
    fontFamily: Typography.fontBody,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 24,
    opacity: 0.9,
  },
  checkpointCard: {
    borderColor: Colors.accentDim,
    gap: Spacing.xs,
  },
  checkpointLabel: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.accent,
  },
  checkpointDesc: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  prevStepsCard: { gap: Spacing.sm },
  prevStepsLabel: {
    fontFamily: Typography.fontMono,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.textDim,
    marginBottom: Spacing.xs,
  },
  prevStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 3,
    opacity: 0.5,
  },
  prevStepNum: {
    fontFamily: Typography.fontMono,
    fontSize: 10,
    color: Colors.textDim,
    width: 20,
  },
  prevStepTitle: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textDim,
    flex: 1,
  },
  prevStepDone: {
    fontFamily: Typography.fontMono,
    fontSize: 11,
    color: Colors.success,
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  actionBtnAccent: {
    backgroundColor: Colors.accentGlow,
    borderColor: Colors.accentDim,
    borderBottomColor: Colors.accent,
    borderBottomWidth: 2,
  },
  actionBtnText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: Colors.textSecondary,
  },
  actionBtnTextAccent: {
    color: Colors.accent,
  },
  errorText: {
    fontFamily: Typography.fontBody,
    fontSize: 14,
    color: Colors.danger,
    textAlign: 'center',
  },
  whyCard: {
    borderColor: Colors.border,
    backgroundColor: 'rgba(255,255,255,0.01)',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  whyLabel: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.accent,
  },
  whyText: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  actionBtnLocked: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    opacity: 0.5,
  },
  actionBtnTextLocked: {
    color: Colors.textSecondary,
  },
  checkpointVerifiedCard: {
    borderColor: Colors.success,
    backgroundColor: Colors.successBg,
  },
  checkpointVerifiedLabel: {
    color: Colors.success,
  },
  overrideContainer: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  overrideHint: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  checkpointOverriddenCard: {
    borderColor: Colors.purple,
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
  },
  checkpointOverriddenLabel: {
    color: Colors.purple,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  sessionMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
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
