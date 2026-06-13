import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import type { StackScreenProps } from '@react-navigation/stack';
import type { StudentStackParamList, Experiment, AIAnalysisResult } from '../../types';
import { aiAPI, experimentsAPI, sessionsAPI, overrideAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { CyanButton } from '../../components/CyanButton';
import { AIThinkingIndicator } from '../../components/AIThinkingIndicator';
import { GlassCard } from '../../components/GlassCard';

type Props = StackScreenProps<StudentStackParamList, 'Results'>;

export function ResultsScreen({ route, navigation }: Props) {
  const { sessionId, experimentId } = route.params;
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [loadingExp, setLoadingExp] = useState(true);
  const [observations, setObservations] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isFormComplete = useCallback(() => {
    if (!experiment || !experiment.result_questions) return false;
    return experiment.result_questions.every((q) => {
      const val = answers[q.id];
      return val !== undefined && val !== null && val.trim() !== '';
    });
  }, [experiment, answers]);

  const loadData = useCallback(async () => {
    try {
      const exp = await experimentsAPI.getById(experimentId);
      setExperiment(exp);
      const sess = await sessionsAPI.getById(sessionId);
      setSession(sess);

      // Load checkpoints photos and overrides
      const ckPoints = await Promise.all(
        exp.steps
          .filter((s) => s.checkpoint_required)
          .map(async (s) => {
            const photoUri = await AsyncStorage.getItem(`@photo_${sessionId}_${s.step_number}`);
            let status = 'none';
            try {
              const check = await overrideAPI.checkStatus(sessionId, s.step_number);
              status = check.status;
            } catch {
              // Ignore 404
            }
            return {
              stepNumber: s.step_number,
              title: s.title,
              photoUri,
              overrideStatus: status,
            };
          })
      );
      setCheckpoints(ckPoints);
    } catch {
      // non-blocking
    } finally {
      setLoadingExp(false);
    }
  }, [experimentId, sessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getDuration = () => {
    if (!session || !session.started_at) return null;
    const start = new Date(session.started_at);
    const end = session.completed_at ? new Date(session.completed_at) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins > 0 ? `${diffMins} mins` : 'Under a minute';
  };

  async function handleShare() {
    if (!result || !experiment) return;
    try {
      const message = `Lab Report: ${experiment.name}
Accuracy Assessment: ${result.accuracy_assessment}
Deviation: ${result.deviation}%
Expected: ${result.expected}
Observed: ${result.observed}

Learning Summary:
${result.learning_summary}`;
      await Share.share({
        title: `${experiment.name} Report`,
        message,
      });
    } catch (e) {
      // Ignore
    }
  }

  async function handleAnalyse() {
    const hasQuestions = experiment?.result_questions && experiment.result_questions.length > 0;

    if (hasQuestions) {
      if (!isFormComplete()) {
        setError('Please answer all questions before submitting.');
        return;
      }
    } else {
      if (!observations.trim()) {
        setError('Please enter your experimental observations before submitting.');
        return;
      }
    }
    setError(null);
    setAnalysing(true);

    try {
      const exp = experiment ?? { name: 'Experiment', steps: [] };
      const stepsCompleted = exp.steps?.length ?? 0;

      const payload: any = {
        experiment: exp as unknown as Record<string, unknown>,
        session_id: sessionId,
        steps_completed: stepsCompleted,
      };

      if (hasQuestions) {
        payload.answers = experiment!.result_questions!.map((q) => ({
          question_id: q.id,
          question: q.question,
          answer: answers[q.id] || '',
          unit: q.unit,
        }));
      } else {
        payload.observations = observations.trim();
      }

      const data = await aiAPI.analyzeResults(payload);
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed. Please try again.');
    } finally {
      setAnalysing(false);
    }
  }
  const totalQuestions = experiment?.result_questions?.length ?? 0;
  const answeredCount = experiment?.result_questions?.filter(q => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id].trim() !== '').length ?? 0;
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.completeBadge}>● EXPERIMENT COMPLETE</Text>
            <Text style={styles.title}>{result ? 'ANALYSIS REPORT' : 'SUBMIT RESULTS'}</Text>
            {experiment ? (
              <Text style={styles.expName}>{experiment.name}</Text>
            ) : loadingExp ? (
              <ActivityIndicator color={Colors.accent} size="small" />
            ) : null}
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <GlassCard style={styles.statsBox}>
              <Text style={styles.statsLabel}>DURATION</Text>
              <Text style={styles.statsValue}>{getDuration() ?? '—'}</Text>
            </GlassCard>
            <GlassCard style={styles.statsBox}>
              <Text style={styles.statsLabel}>STEPS</Text>
              <Text style={styles.statsValue}>{experiment?.steps.length ?? '—'}</Text>
            </GlassCard>
            <GlassCard style={styles.statsBox}>
              <Text style={styles.statsLabel}>CHECKPOINTS</Text>
              <Text style={styles.statsValue}>{checkpoints.length}</Text>
            </GlassCard>
          </View>

          {/* Observations / Question Form input (only when not submitted yet) */}
          {!result && (
            experiment?.result_questions && experiment.result_questions.length > 0 ? (
              <View style={styles.formContainer}>
                {/* Form Header */}
                <View style={styles.formHeader}>
                  <Text style={styles.formHeaderTitle}>RECORD YOUR RESULTS</Text>
                  <Text style={styles.formHeaderSubtitle}>
                    Answer each question based on what you observed during the experiment
                  </Text>
                </View>

                {/* Progress indicator */}
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    {answeredCount} / {totalQuestions} ANSWERED
                  </Text>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                  </View>
                </View>

                {/* Questions */}
                {experiment.result_questions.map((q, idx) => (
                  <GlassCard key={q.id} style={styles.questionCard}>
                    <View style={styles.questionHeader}>
                      <Text style={styles.questionNumber}>Q{idx + 1}</Text>
                    </View>
                    <Text style={styles.questionText}>{q.question}</Text>
                    
                    {/* Input based on type */}
                    {q.type === 'number' && (
                      <View style={styles.numberInputRow}>
                        <TextInput
                          style={styles.numberInput}
                          value={answers[q.id] || ''}
                          onChangeText={(v) => {
                            setAnswers({ ...answers, [q.id]: v });
                            setError(null);
                          }}
                          placeholder={q.placeholder || 'Enter value'}
                          placeholderTextColor={Colors.textDim}
                          keyboardType="numeric"
                          editable={!analysing}
                        />
                        {q.unit && <Text style={styles.unitLabel}>{q.unit}</Text>}
                      </View>
                    )}

                    {q.type === 'text' && (
                      <TextInput
                        style={styles.textInput}
                        value={answers[q.id] || ''}
                        onChangeText={(v) => {
                          setAnswers({ ...answers, [q.id]: v });
                          setError(null);
                        }}
                        placeholder={q.placeholder || 'Enter text'}
                        placeholderTextColor={Colors.textDim}
                        editable={!analysing}
                      />
                    )}

                    {q.type === 'boolean' && (
                      <View style={styles.booleanRow}>
                        <TouchableOpacity
                          style={[
                            styles.booleanBtn,
                            answers[q.id] === 'YES' && styles.booleanBtnSelected,
                          ]}
                          onPress={() => {
                            setAnswers({ ...answers, [q.id]: 'YES' });
                            setError(null);
                          }}
                          disabled={analysing}
                        >
                          <Text
                            style={[
                              styles.booleanBtnText,
                              answers[q.id] === 'YES' && styles.booleanBtnTextSelected,
                            ]}
                          >
                            YES
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.booleanBtn,
                            answers[q.id] === 'NO' && styles.booleanBtnSelected,
                          ]}
                          onPress={() => {
                            setAnswers({ ...answers, [q.id]: 'NO' });
                            setError(null);
                          }}
                          disabled={analysing}
                        >
                          <Text
                            style={[
                              styles.booleanBtnText,
                              answers[q.id] === 'NO' && styles.booleanBtnTextSelected,
                            ]}
                          >
                            NO
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {q.type === 'textarea' && (
                      <TextInput
                        style={styles.textareaInput}
                        value={answers[q.id] || ''}
                        onChangeText={(v) => {
                          setAnswers({ ...answers, [q.id]: v });
                          setError(null);
                        }}
                        placeholder={q.placeholder || 'Enter observations...'}
                        placeholderTextColor={Colors.textDim}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        editable={!analysing}
                      />
                    )}
                  </GlassCard>
                ))}
              </View>
            ) : (
              <GlassCard style={styles.obsCard}>
                <Text style={styles.fieldLabel}>EXPERIMENTAL OBSERVATIONS</Text>
                <Text style={styles.fieldHint}>
                  Describe your results, measurements, colour changes, endpoint observations, and any anomalies.
                </Text>
                <TextInput
                  style={styles.obsInput}
                  value={observations}
                  onChangeText={(v) => { setObservations(v); setError(null); }}
                  placeholder="e.g. Concordant titration volumes: 24.75, 24.78, 24.80 mL. Endpoint observed at pale pink colouration persisting 30+ seconds. Calculated NaOH concentration: 0.0991 mol/L..."
                  placeholderTextColor={Colors.textDim}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  editable={!analysing}
                />
                <Text style={styles.charCount}>{observations.length} / 1000</Text>
              </GlassCard>
            )
          )}

          {/* Error */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>△ {error}</Text>
            </View>
          ) : null}

          {/* Analyse button */}
          {!result && (
            <CyanButton
              label="SUBMIT & ANALYSE →"
              onPress={handleAnalyse}
              loading={analysing}
              disabled={analysing || (experiment?.result_questions && experiment.result_questions.length > 0 ? !isFormComplete() : !observations.trim())}
              style={styles.analyseBtn}
            />
          )}

          {/* Thinking */}
          {analysing && (
            <View style={styles.thinkingContainer}>
              <AIThinkingIndicator message="AI is generating your learning analysis..." />
            </View>
          )}

          {/* Results Analysis */}
          {result && (
            <View style={styles.resultSection}>
              {/* Deviation Gauge & Comparison Row */}
              <View style={styles.metricsContainer}>
                {/* Circular Gauge Card */}
                <GlassCard style={styles.gaugeCard}>
                  <Text style={styles.metricsHeader}>DEVIATION</Text>
                  {(() => {
                    const deviation = result.deviation ?? 0;
                    const accuracy = Math.max(0, 100 - deviation);
                    const size = 100;
                    const strokeWidth = 6;
                    const radius = (size - strokeWidth) / 2;
                    const circumference = radius * 2 * Math.PI;
                    const strokeDashoffset = circumference - (accuracy / 100) * circumference;
                    
                    let gaugeColor: string = Colors.success;
                    if (deviation >= 5 && deviation <= 15) {
                      gaugeColor = Colors.warning;
                    } else if (deviation > 15) {
                      gaugeColor = Colors.danger;
                    }

                    return (
                      <View style={styles.gaugeWrapper}>
                        <Svg width={size} height={size}>
                          <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke={Colors.borderStrong}
                            strokeWidth={strokeWidth}
                            fill="none"
                          />
                          <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke={gaugeColor}
                            strokeWidth={strokeWidth}
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            fill="none"
                            transform={`rotate(-90 ${size / 2} ${size / 2})`}
                          />
                        </Svg>
                        <View style={styles.gaugeTextCenter}>
                          <Text style={[styles.gaugeValText, { color: gaugeColor }]}>
                            {deviation.toFixed(1)}%
                          </Text>
                          <Text style={styles.gaugeLabelText}>DEVIATION</Text>
                        </View>
                      </View>
                    );
                  })()}
                </GlassCard>

                {/* Comparison Card */}
                <View style={styles.comparisonColumn}>
                  <GlassCard style={styles.comparisonBox}>
                    <Text style={styles.comparisonLabel}>EXPECTED VALUE</Text>
                    <Text style={styles.comparisonValue} numberOfLines={2}>
                      {result.expected ?? '—'}
                    </Text>
                  </GlassCard>
                  <GlassCard style={styles.comparisonBox}>
                    <Text style={styles.comparisonLabel}>OBSERVED VALUE</Text>
                    <Text style={styles.comparisonValue} numberOfLines={2}>
                      {result.observed ?? '—'}
                    </Text>
                  </GlassCard>
                </View>
              </View>



              {/* Analysis Text Card */}
              <GlassCard style={styles.resultCard}>
                <Text style={styles.resultCardTitle}>ANALYSIS</Text>
                <Text style={styles.resultCardText}>{result.analysis}</Text>
              </GlassCard>

              {/* Accuracy Assessment Text Card */}
              <GlassCard style={[styles.resultCard, styles.accuracyCard]}>
                <Text style={styles.resultCardTitle}>ACCURACY ASSESSMENT</Text>
                <Text style={[styles.resultCardText, styles.accuracyText]}>
                  {result.accuracy_assessment}
                </Text>
              </GlassCard>

              {/* Learning Summary Card */}
              <GlassCard style={styles.resultCard}>
                <Text style={styles.resultCardTitle}>LEARNING SUMMARY</Text>
                <Text style={styles.resultCardText}>{result.learning_summary}</Text>
              </GlassCard>

              {/* Possible Errors (individual cards, no bullet list) */}
              {result.possible_errors.length > 0 && (
                <View style={styles.sectionGap}>
                  <Text style={styles.subHeading}>POSSIBLE ERRORS</Text>
                  {result.possible_errors.map((err, i) => (
                    <GlassCard key={i} style={styles.errorCard}>
                      <Text style={styles.errorCardBullet}>△</Text>
                      <Text style={styles.errorCardText}>{err}</Text>
                    </GlassCard>
                  ))}
                </View>
              )}

              {/* Recommendations Card */}
              {result.recommendations.length > 0 && (
                <GlassCard style={styles.resultCard}>
                  <Text style={styles.resultCardTitle}>RECOMMENDATIONS</Text>
                  {result.recommendations.map((rec, i) => (
                    <View key={i} style={styles.recRow}>
                      <Text style={styles.recBullet}>→</Text>
                      <Text style={styles.listText}>{rec}</Text>
                    </View>
                  ))}
                </GlassCard>
              )}

              {/* Share & Dashboard Actions */}
              <View style={styles.buttonRow}>
                <CyanButton
                  label="SHARE REPORT"
                  onPress={handleShare}
                  variant="ghost"
                  style={styles.shareBtn}
                />
                <CyanButton
                  label="DASHBOARD"
                  onPress={() => navigation.navigate('Dashboard')}
                  style={styles.dashBtn}
                />
              </View>


            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  kav: { flex: 1 },
  scroll: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.xxxl },
  header: { gap: Spacing.sm },
  completeBadge: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.success,
  },
  title: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 26,
    letterSpacing: 3,
    color: Colors.textPrimary,
  },
  expName: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statsBox: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statsLabel: {
    fontFamily: Typography.fontMono,
    fontSize: 7.5,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  statsValue: {
    fontFamily: Typography.fontHeading,
    fontSize: 15,
    color: Colors.accent,
  },
  obsCard: { gap: Spacing.sm },
  fieldLabel: {
    fontFamily: Typography.fontMono,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.textSecondary,
  },
  fieldHint: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textDim,
    lineHeight: 18,
  },
  obsInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontFamily: Typography.fontBody,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 140,
    marginTop: Spacing.sm,
  },
  charCount: {
    fontFamily: Typography.fontMono,
    fontSize: 10,
    color: Colors.textDim,
    textAlign: 'right',
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
  analyseBtn: { width: '100%' },
  thinkingContainer: { alignItems: 'center', paddingVertical: Spacing.lg },
  resultSection: { gap: Spacing.lg },
  metricsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  gaugeCard: {
    flex: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  metricsHeader: {
    fontFamily: Typography.fontMono,
    fontSize: 8,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  gaugeWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeTextCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeValText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 16,
  },
  gaugeLabelText: {
    fontFamily: Typography.fontMono,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 0.5,
  },
  comparisonColumn: {
    flex: 1,
    gap: Spacing.md,
  },
  comparisonBox: {
    flex: 1,
    gap: 4,
    borderLeftWidth: 2,
    borderLeftColor: Colors.accent,
  },
  comparisonLabel: {
    fontFamily: Typography.fontMono,
    fontSize: 8,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  comparisonValue: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  timelineContainer: {
    gap: Spacing.xs,
  },
  subHeading: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 2,
    marginVertical: Spacing.xs,
  },
  timelineScroll: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  timelineCard: {
    width: 150,
    gap: Spacing.xs,
  },
  timelineStepNumber: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 9,
    color: Colors.accent,
    letterSpacing: 1,
  },
  timelineStepTitle: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    color: Colors.textPrimary,
  },
  thumbnailWrapper: {
    width: '100%',
    height: 80,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    marginVertical: Spacing.xs,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  thumbnailPlaceholderText: {
    fontFamily: Typography.fontMono,
    fontSize: 20,
    color: Colors.textDim,
  },
  thumbnailPlaceholderSub: {
    fontFamily: Typography.fontMono,
    fontSize: 8,
    color: Colors.textDim,
  },
  timelineBadge: {
    paddingVertical: 2,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  badgeVerified: {
    borderColor: Colors.success,
    backgroundColor: Colors.successBg,
  },
  badgeVerifiedText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 8,
    color: Colors.success,
    letterSpacing: 1,
  },
  badgeOverridden: {
    borderColor: Colors.purple,
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
  },
  badgeOverriddenText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 8,
    color: Colors.purple,
    letterSpacing: 1,
  },
  badgeBypassed: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerBg,
  },
  badgeBypassedText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 8,
    color: Colors.danger,
    letterSpacing: 1,
  },
  resultCard: {
    gap: Spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: Colors.accent,
  },
  accuracyCard: {
    borderLeftColor: Colors.accent,
    borderLeftWidth: 2,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  resultCardTitle: {
    fontFamily: Typography.fontMono,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.textSecondary,
  },
  resultCardText: {
    fontFamily: Typography.fontBody,
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  accuracyText: {
    color: Colors.accent,
    fontFamily: Typography.fontBody,
  },
  sectionGap: {
    gap: Spacing.sm,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: Colors.warning,
    backgroundColor: Colors.warningBg,
  },
  errorCardBullet: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 16,
    color: Colors.warning,
  },
  errorCardText: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  recRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  recBullet: {
    fontFamily: Typography.fontMono,
    fontSize: 12,
    color: Colors.accentDim,
    marginTop: 3,
    width: 16,
  },
  listText: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  shareBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: BorderRadius.sm,
  },
  dashBtn: {
    flex: 1.5,
  },
  formContainer: {
    gap: Spacing.md,
  },
  formHeader: {
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  formHeaderTitle: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 14,
    color: Colors.accent,
    letterSpacing: 2,
  },
  formHeaderSubtitle: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  questionCard: {
    gap: Spacing.xs,
    borderColor: Colors.border,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionNumber: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 10,
    color: Colors.accent,
    letterSpacing: 1,
  },
  questionText: {
    fontFamily: Typography.fontHeading,
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  numberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  numberInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontFamily: Typography.fontBody,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  unitLabel: {
    fontFamily: Typography.fontMono,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontFamily: Typography.fontBody,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  booleanRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  booleanBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  booleanBtnSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  booleanBtnText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  booleanBtnTextSelected: {
    color: Colors.background,
  },
  textareaInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontFamily: Typography.fontBody,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 80,
  },
  progressContainer: {
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  progressText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
});
