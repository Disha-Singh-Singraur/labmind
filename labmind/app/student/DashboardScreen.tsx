import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { StudentStackParamList, Experiment, PreloadedExperiment, MyActiveLabSession } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { experimentsAPI, labSessionAPI, sessionsAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { GlassCard } from '../../components/GlassCard';
import { CyanButton } from '../../components/CyanButton';
import { AIThinkingIndicator } from '../../components/AIThinkingIndicator';

type Props = StackScreenProps<StudentStackParamList, 'Dashboard'>;

// ── Subject colours ────────────────────────────────────────────────────────
const SUBJECT_COLOR: Record<PreloadedExperiment['subject'], string> = {
  Chemistry: Colors.accent,       // cyan
  Biology: '#4ade80',             // green
  Kinetics: '#a78bfa',            // purple
};

const DIFFICULTY_COLOR: Record<PreloadedExperiment['difficulty'], string> = {
  Beginner: '#4ade80',
  Intermediate: '#fbbf24',
  Advanced: '#f87171',
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// ── Preloaded experiment card ──────────────────────────────────────────────
function PreloadedCard({
  exp,
  onStart,
  isStarting,
}: {
  exp: PreloadedExperiment;
  onStart: () => void;
  isStarting: boolean;
}) {
  const subjectColor = SUBJECT_COLOR[exp.subject];
  const diffColor = DIFFICULTY_COLOR[exp.difficulty];

  return (
    <View style={[styles.preloadedCard, { borderLeftColor: subjectColor }]}>
      {/* Subject tag */}
      <View style={styles.preloadedSubjectRow}>
        <View style={[styles.subjectDot, { backgroundColor: subjectColor }]} />
        <Text style={[styles.preloadedSubject, { color: subjectColor }]}>
          {exp.subject.toUpperCase()}
        </Text>
      </View>

      {/* Name */}
      <Text style={styles.preloadedName} numberOfLines={2}>{exp.name}</Text>

      {/* Difficulty badge */}
      <View style={[styles.diffBadge, { borderColor: diffColor }]}>
        <Text style={[styles.diffText, { color: diffColor }]}>
          {exp.difficulty.toUpperCase()}
        </Text>
      </View>

      {/* Stats row */}
      <View style={styles.preloadedStats}>
        <Text style={styles.statText}>{exp.duration_minutes} MIN</Text>
        <Text style={styles.statDivider}>·</Text>
        <Text style={styles.statText}>{exp.step_count} STEPS</Text>
      </View>

      {/* Start button */}
      {isStarting ? (
        <View style={styles.startingBox}>
          <AIThinkingIndicator message="Preparing..." />
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.startBtn, { borderColor: subjectColor }]}
          onPress={onStart}
          activeOpacity={0.75}
        >
          <Text style={[styles.startBtnText, { color: subjectColor }]}>START →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export function DashboardScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [preloaded, setPreloaded] = useState<PreloadedExperiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [preloadedLoading, setPreloadedLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [startingId, setStartingId] = useState<number | null>(null);
  const [activeLabSessions, setActiveLabSessions] = useState<MyActiveLabSession[]>([]);
  const [activeIndividualSessions, setActiveIndividualSessions] = useState<import('../../types').MySession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<import('../../types').MySession[]>([]);

  const firstName = user?.full_name?.split(' ')[0] ?? 'Researcher';

  const loadPreloaded = useCallback(async () => {
    try {
      const data = await experimentsAPI.getPreloaded();
      setPreloaded(data);
    } catch {
      // Silent — quick start section just won't show
    } finally {
      setPreloadedLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [data, activeLabRes, activeIndRes, completedRes] = await Promise.all([
        experimentsAPI.getAll(),
        labSessionAPI.getMyActive(),
        sessionsAPI.getMyActive(),
        sessionsAPI.getMyCompleted(),
      ]);
      setExperiments(data);
      setActiveLabSessions(activeLabRes.active_sessions || []);
      setActiveIndividualSessions(activeIndRes || []);
      setCompletedSessions(completedRes || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load experiments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  async function handleDiscardActiveSession(sessionId: number, name: string) {
    const confirmMsg = `Are you sure you want to discard your progress in "${name}"?\n\nThis will permanently remove this session and all associated data.`;
    let confirm = false;
    if (Platform.OS === 'web') {
      confirm = window.confirm(confirmMsg);
    } else {
      confirm = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Discard Progress',
          confirmMsg,
          [
            { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Discard', onPress: () => resolve(true), style: 'destructive' },
          ],
          { cancelable: true }
        );
      });
    }

    if (!confirm) return;

    try {
      setLoading(true);
      await sessionsAPI.deleteSession(sessionId);
      await load();
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Failed to discard session';
      if (Platform.OS === 'web') {
        window.alert(errMsg);
      } else {
        Alert.alert('Error', errMsg);
      }
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
      loadPreloaded();
    }, [load, loadPreloaded])
  );

  const onRefresh = () => { setRefreshing(true); load(); };

  async function triggerStartFresh(exp: PreloadedExperiment, oldSessionId?: number) {
    setStartingId(exp.id);
    try {
      if (oldSessionId) {
        try {
          await sessionsAPI.deleteSession(oldSessionId);
        } catch (delErr) {
          console.warn('Failed to delete old session:', delErr);
        }
      }
      const result = await experimentsAPI.startPreloaded(exp.id);
      navigation.navigate('ExperimentSession', {
        sessionId: result.session_id,
        experimentId: result.experiment_id,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start experiment');
    } finally {
      setStartingId(null);
    }
  }

  async function handleStartPreloaded(exp: PreloadedExperiment) {
    if (startingId !== null) return;

    // Check if there is already an active session for this preloaded experiment template name
    const existingActive = experiments.find(
      (e) => e.active_session_id && e.name.startsWith(exp.name)
    );

    if (existingActive && existingActive.active_session_id) {
      if (Platform.OS === 'web') {
        const resume = window.confirm(`You have an active session for "${exp.name}".\n\nClick OK to Resume, or Cancel to Start a Fresh session.`);
        if (resume) {
          navigation.navigate('ExperimentSession', {
            sessionId: existingActive.active_session_id,
            experimentId: existingActive.id,
          });
        } else {
          triggerStartFresh(exp, existingActive.active_session_id);
        }
        return;
      }

      // Mobile native alert prompt
      Alert.alert(
        'In-Progress Session',
        `You have an active session for "${exp.name}". Would you like to resume it or start a fresh session?`,
        [
          {
            text: 'Resume',
            onPress: () => {
              navigation.navigate('ExperimentSession', {
                sessionId: existingActive.active_session_id!,
                experimentId: existingActive.id,
              });
            },
          },
          {
            text: 'Start Fresh',
            style: 'destructive',
            onPress: () => {
              triggerStartFresh(exp, existingActive.active_session_id!);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
      return;
    }

    // Otherwise start a new one directly
    triggerStartFresh(exp);
  }

  const recentExperiments = experiments.slice(0, 3);
  const activeExperiment = experiments.find(
    (e) => e.active_session_id !== null && e.active_session_id !== undefined
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}, {firstName}</Text>
            <Text style={styles.date}>{formatDate()}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>SIGN OUT</Text>
          </TouchableOpacity>
        </View>

        {/* Status bar */}
        <View style={styles.statusBar}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>SYSTEM READY · MOCK AI MODE</Text>
        </View>

        {/* New experiment button */}
        <CyanButton
          label="+ UPLOAD PDF PROTOCOL"
          onPress={() => navigation.navigate('UploadProtocol')}
          style={styles.newExpBtn}
          variant="primary"
        />

        {/* JOIN SESSION Banner */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('JoinSession')}
        >
          <GlassCard style={styles.joinSessionBanner}>
            <View style={styles.joinSessionContent}>
              <Text style={styles.joinSessionIcon}>🔑</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.joinSessionTitle}>JOIN LAB SESSION</Text>
                <Text style={styles.joinSessionSub}>Enter 6-char code from your instructor</Text>
              </View>
              <Text style={styles.joinSessionArrow}>→</Text>
            </View>
          </GlassCard>
        </TouchableOpacity>

        {/* ── QUICK START ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>QUICK START</Text>
            <Text style={styles.sectionSub}>Pre-loaded experiments — no upload required</Text>
          </View>

          {preloadedLoading ? (
            <View style={styles.loadingCenter}>
              <AIThinkingIndicator message="Loading experiments..." />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.preloadedRow}
            >
              {preloaded.map((exp) => (
                <PreloadedCard
                  key={exp.id}
                  exp={exp}
                  isStarting={startingId === exp.id}
                  onStart={() => handleStartPreloaded(exp)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Active Lab Sessions */}
        {activeLabSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>ACTIVE LAB SESSIONS</Text>
              <Text style={styles.sectionCount}>{activeLabSessions.length} JOINED</Text>
            </View>
            {activeLabSessions.map((session) => (
              <GlassCard key={session.session_id} style={styles.labSessionCard}>
                <View style={styles.labSessionHeader}>
                  <View style={styles.labSessionBadge}>
                    <Text style={styles.labSessionBadgeText}>LIVE SESSION</Text>
                  </View>
                  <View style={styles.labSessionCodeBox}>
                    <Text style={styles.labSessionCode}>{session.code}</Text>
                  </View>
                </View>
                <Text style={styles.labSessionName}>{session.name}</Text>
                <Text style={styles.labSessionExpName}>{session.experiment_name}</Text>
                
                {/* Instructor and Student details */}
                <View style={styles.labSessionMetaRow}>
                  <Text style={styles.labSessionMetaLabel}>INSTRUCTOR: <Text style={styles.labSessionMetaValue}>{session.instructor_name || 'Unknown'}</Text></Text>
                  <Text style={styles.labSessionMetaDivider}>·</Text>
                  <Text style={styles.labSessionMetaLabel}>STUDENTS: <Text style={styles.labSessionMetaValue}>{session.student_count || 1}</Text></Text>
                </View>

                {session.experiment_session_id ? (
                  <View style={styles.labSessionProgressRow}>
                    <Text style={styles.labSessionProgressText}>
                      Progress: Step {session.current_step_number} of {session.total_steps}
                    </Text>
                    <CyanButton
                      label="CONTINUE FLOW →"
                      onPress={() => navigation.navigate('ExperimentSession', {
                        sessionId: session.experiment_session_id!,
                        experimentId: session.experiment_id,
                        labEnrollmentId: session.enrollment_id,
                      })}
                      style={styles.labSessionContinueBtn}
                    />
                  </View>
                ) : (
                  <View style={styles.labSessionProgressRow}>
                    <Text style={styles.labSessionProgressText}>Not started yet</Text>
                    <CyanButton
                      label="START ASSIGNED LAB →"
                      onPress={() => navigation.navigate('ExperimentOverview', {
                        experimentId: session.experiment_id,
                        labEnrollmentId: session.enrollment_id,
                      })}
                      style={styles.labSessionContinueBtn}
                    />
                  </View>
                )}
              </GlassCard>
            ))}
          </View>
        )}

        {/* Active Protocols list */}
        {activeIndividualSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>ACTIVE PROTOCOLS</Text>
              <Text style={styles.sectionCount}>{activeIndividualSessions.length} IN PROGRESS</Text>
            </View>
            {activeIndividualSessions.map((session) => (
              <GlassCard key={session.id} style={styles.activeCard}>
                <View style={styles.activeHeader}>
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>ACTIVE</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDiscardActiveSession(session.id, session.experiment_name)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.removeTextBtn}>✕ DISCARD</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.activeExpName} numberOfLines={2}>
                  {session.experiment_name}
                </Text>
                <Text style={styles.activeObjective} numberOfLines={2}>
                  {session.experiment_objective}
                </Text>
                
                <View style={styles.labSessionProgressRow}>
                  <Text style={styles.labSessionProgressText}>
                    Progress: Step {session.current_step_number} of {session.total_steps}
                  </Text>
                  <CyanButton
                    label="CONTINUE FLOW →"
                    onPress={() =>
                      navigation.navigate('ExperimentSession', {
                        sessionId: session.id,
                        experimentId: session.experiment_id,
                      })
                    }
                    style={styles.labSessionContinueBtn}
                  />
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Completed Protocols list */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>COMPLETED PROTOCOLS</Text>
            <Text style={styles.sectionCount}>{completedSessions.length} TOTAL</Text>
          </View>

          {loading ? (
            <View style={styles.loadingCenter}>
              <AIThinkingIndicator message="Loading..." />
            </View>
          ) : error ? (
            <GlassCard>
              <Text style={styles.errorText}>△ {error}</Text>
              <CyanButton label="RETRY" onPress={load} variant="ghost" />
            </GlassCard>
          ) : completedSessions.length === 0 ? (
            <GlassCard>
              <Text style={styles.emptyText}>// no completed protocols yet</Text>
              <Text style={styles.emptySubtext}>
                Upload a PDF protocol or start a quick start template to begin.
              </Text>
            </GlassCard>
          ) : (
            completedSessions.map((session) => (
              <GlassCard key={session.id} style={styles.expCard}>
                <View style={styles.activeHeader}>
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedBadgeText}>COMPLETED</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDiscardActiveSession(session.id, session.experiment_name)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.removeTextBtn}>✕ REMOVE</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() =>
                    navigation.navigate('Results', {
                      sessionId: session.id,
                      experimentId: session.experiment_id,
                    })
                  }
                >
                  <Text style={styles.expCardName} numberOfLines={1}>
                    {session.experiment_name}
                  </Text>
                  <Text style={styles.expCardMeta}>
                    {session.total_steps} steps · Completed {session.completed_at ? new Date(session.completed_at).toLocaleDateString() : ''}
                  </Text>
                </TouchableOpacity>
              </GlassCard>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.xxxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontFamily: Typography.fontHeading,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  date: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  logoutBtn: { paddingVertical: Spacing.xs },
  logoutText: {
    fontFamily: Typography.fontMono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: Colors.textDim,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  statusText: {
    fontFamily: Typography.fontMono,
    fontSize: 9,
    letterSpacing: 1.5,
    color: Colors.textDim,
  },
  section: { gap: Spacing.md },
  sectionHeader: { gap: 2 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sectionCount: {
    fontFamily: Typography.fontMono,
    fontSize: 10,
    color: Colors.accent,
  },
  sectionLabel: {
    fontFamily: Typography.fontMono,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.accent,
  },
  sectionSub: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  // ── Preloaded cards ──
  preloadedRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingRight: Spacing.xl,
  },
  preloadedCard: {
    width: 200,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  preloadedSubjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  subjectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  preloadedSubject: {
    fontFamily: Typography.fontMono,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  preloadedName: {
    fontFamily: Typography.fontHeading,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  diffBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  diffText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 8,
    letterSpacing: 1.2,
  },
  preloadedStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    fontFamily: Typography.fontMono,
    fontSize: 10,
    color: Colors.textDim,
    letterSpacing: 0.5,
  },
  statDivider: {
    fontFamily: Typography.fontMono,
    fontSize: 10,
    color: Colors.textDim,
  },
  startBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  startBtnText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  startingBox: {
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  // ── Active experiment ──
  activeCard: { gap: Spacing.sm },
  activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activePill: {
    backgroundColor: Colors.accentGlow,
    borderWidth: 1,
    borderColor: Colors.accentDim,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  activePillText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: Colors.accent,
  },
  activeStepCount: {
    fontFamily: Typography.fontMono,
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  activeExpName: {
    fontFamily: Typography.fontHeading,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  activeObjective: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  continueBtn: { marginTop: Spacing.sm },
  newExpBtn: { width: '100%' },
  joinSessionBanner: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    padding: Spacing.md,
  },
  joinSessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  joinSessionIcon: {
    fontSize: 22,
  },
  joinSessionTitle: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: Colors.textPrimary,
  },
  joinSessionSub: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  joinSessionArrow: {
    fontFamily: Typography.fontMono,
    fontSize: 16,
    color: Colors.accentDim,
  },
  labSessionCard: {
    gap: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  labSessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labSessionBadge: {
    backgroundColor: Colors.accentGlow,
    borderWidth: 1,
    borderColor: Colors.accentDim,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  labSessionBadgeText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: Colors.accent,
  },
  labSessionCodeBox: {
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    backgroundColor: Colors.accentGlow,
  },
  labSessionCode: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 12,
    color: Colors.accent,
    letterSpacing: 2,
  },
  labSessionName: {
    fontFamily: Typography.fontHeading,
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  labSessionExpName: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  labSessionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 6,
    marginBottom: 2,
  },
  labSessionMetaLabel: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: Colors.textDim,
  },
  labSessionMetaValue: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  labSessionMetaDivider: {
    fontFamily: Typography.fontMono,
    fontSize: 11,
    color: Colors.textDim,
  },
  labSessionProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.md,
  },
  labSessionProgressText: {
    fontFamily: Typography.fontMono,
    fontSize: 11,
    color: Colors.textSecondary,
    flex: 1,
  },
  labSessionContinueBtn: {
    minWidth: 140,
  },
  loadingCenter: { alignItems: 'center', paddingVertical: Spacing.xl },
  expCard: {
    marginBottom: 0,
    gap: Spacing.sm,
  },
  expCardName: {
    fontFamily: Typography.fontHeading,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  expCardMeta: {
    fontFamily: Typography.fontMono,
    fontSize: 11,
    color: Colors.textDim,
    letterSpacing: 0.5,
  },

  errorText: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: Colors.danger,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: Typography.fontMono,
    fontSize: 12,
    color: Colors.textDim,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  removeTextBtn: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.danger,
  },
  completedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: Colors.success,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginBottom: Spacing.xs,
    alignSelf: 'flex-start',
  },
  completedBadgeText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 8,
    letterSpacing: 1,
    color: Colors.success,
  },
});

