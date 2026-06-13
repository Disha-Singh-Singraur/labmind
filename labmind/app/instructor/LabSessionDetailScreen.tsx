import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import * as Clipboard from 'expo-clipboard';
import { labSessionAPI, overrideAPI, BASE_URL } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { GlassCard } from '../../components/GlassCard';
import type { StudentStackParamList, LabSessionDetail, LabSessionStudent } from '../../types';

type Props = StackScreenProps<StudentStackParamList, 'LabSessionDetail'>;

function getSyncTime(): string {
  const n = new Date();
  const p = (v: number) => String(v).padStart(2, '0');
  return `${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
}

function progressColor(status: LabSessionStudent['status']): string {
  switch (status) {
    case 'active': return Colors.accent;
    case 'completed': return Colors.success;
    case 'safety_alert': return Colors.warning;
    default: return Colors.textDim;
  }
}

export function LabSessionDetailScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const [detail, setDetail] = useState<LabSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState(getSyncTime());
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDetail = useCallback(async (show = true) => {
    if (show) setLoading(true);
    setError(null);
    try {
      const data = await labSessionAPI.getDetail(sessionId);
      setDetail(data);
      setLastSync(getSyncTime());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load session');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchDetail(true);
    intervalRef.current = setInterval(() => fetchDetail(false), 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchDetail]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDetail(false);
  }, [fetchDetail]);

  const handleClose = () => {
    if (detail?.status !== 'active') return;
    Alert.alert(
      'Close Session',
      'Are you sure you want to close this session? Students will no longer be able to join.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Session',
          style: 'destructive',
          onPress: async () => {
            setClosing(true);
            try {
              await labSessionAPI.close(sessionId);
              await fetchDetail(false);
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : 'Failed to close session');
            } finally {
              setClosing(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session? This action cannot be undone and will delete all student enrollments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await labSessionAPI.delete(sessionId);
              navigation.goBack();
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : 'Failed to delete session');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleApprove = async (requestId: number) => {
    setActioningId(requestId);
    try {
      await overrideAPI.approve(requestId);
      await fetchDetail(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (requestId: number) => {
    setActioningId(requestId);
    try {
      await overrideAPI.reject(requestId);
      await fetchDetail(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Rejection failed');
    } finally {
      setActioningId(null);
    }
  };

  const isActive = detail?.status === 'active';

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          {isActive && (
            <TouchableOpacity
              style={[styles.closeBtn, closing && { opacity: 0.5 }]}
              onPress={handleClose}
              disabled={closing}
            >
              {closing
                ? <ActivityIndicator color={Colors.danger} size="small" />
                : <Text style={styles.closeBtnText}>CLOSE SESSION</Text>
              }
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.deleteBtn, deleting && { opacity: 0.5 }]}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting
              ? <ActivityIndicator color={Colors.danger} size="small" />
              : <Text style={styles.deleteBtnText}>DELETE</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Session info */}
      {detail && (
        <View style={styles.sessionInfoBar}>
          {/* Big code */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleCopyCode(detail.code)}
            style={styles.codeSection}
          >
            <Text style={styles.bigCode}>{detail.code}</Text>
            <View style={[styles.statusBadge, { borderColor: copied ? Colors.success : (isActive ? Colors.accent : Colors.textDim) }]}>
              <Text style={[styles.statusBadgeText, { color: copied ? Colors.success : (isActive ? Colors.accent : Colors.textDim) }]}>
                {copied ? 'COPIED!' : detail.status.toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.sessionName}>{detail.name}</Text>
          <Text style={styles.sessionExp}>{detail.experiment_name}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statNum}>{detail.student_count}</Text>
              <Text style={styles.statLbl}>STUDENTS</Text>
            </View>
            {detail.alert_count > 0 && (
              <View style={[styles.statChip, { borderColor: Colors.warning }]}>
                <Text style={[styles.statNum, { color: Colors.warning }]}>{detail.alert_count}</Text>
                <Text style={[styles.statLbl, { color: Colors.warning }]}>ALERTS</Text>
              </View>
            )}
            <View style={styles.statChip}>
              <Text style={styles.statNum}>
                {detail.students.filter(s => s.status === 'completed').length}
              </Text>
              <Text style={styles.statLbl}>DONE</Text>
            </View>
          </View>

          <Text style={styles.syncText}>LIVE SYNC {lastSync}</Text>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>△ {error}</Text>
        </View>
      )}

      {/* Student list */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.accent} size="large" />
          </View>
        ) : !detail ? null : detail.students.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No students yet</Text>
            <Text style={styles.emptySub}>
              Share code <Text style={styles.emptyCode}>{detail.code}</Text> with your students
            </Text>
          </GlassCard>
        ) : (
          <>
            {/* Alert students first */}
            {detail.students
              .slice()
              .sort((a, b) => {
                const order = { safety_alert: 0, active: 1, not_started: 2, inactive: 3, completed: 4 };
                return (order[a.status] ?? 5) - (order[b.status] ?? 5);
              })
              .map((student) => {
                const color = progressColor(student.status);
                const hasOverride = student.pending_override !== null;

                return (
                  <GlassCard
                    key={student.student_id}
                    style={[styles.studentCard, { borderLeftColor: color }]}
                  >
                    {/* Top row */}
                    <View style={styles.studentTop}>
                      <Text style={styles.studentName}>{student.student_name}</Text>
                      <View style={[styles.statusBadgeSmall, { borderColor: color }]}>
                        <Text style={[styles.statusBadgeSmallText, { color }]}>
                          {student.status === 'safety_alert' ? '⚠ ALERT'
                            : student.status === 'not_started' ? 'NOT STARTED'
                            : student.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Step / progress */}
                    {student.status !== 'not_started' && student.total_steps > 0 && (
                      <>
                        <Text style={styles.stepInfo}>
                          STEP {student.current_step_number}/{student.total_steps}
                          {'  '}
                          <Text style={[styles.stepPct, { color }]}>
                            {student.progress_percent}%
                          </Text>
                        </Text>
                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${student.progress_percent}%` as any, backgroundColor: color },
                            ]}
                          />
                        </View>
                      </>
                    )}

                    {/* Override request card */}
                    {hasOverride && student.pending_override && (
                      <View style={styles.overrideBox}>
                        <Text style={styles.overrideLabel}>
                          OVERRIDE REQUEST — STEP {student.pending_override.step_number}
                        </Text>
                        {student.pending_override.step_description && (
                          <Text style={styles.overrideDesc} numberOfLines={3}>
                            {student.pending_override.step_description}
                          </Text>
                        )}
                        {student.pending_override.image_path && (
                          <Image
                            source={{ uri: `${BASE_URL}${student.pending_override.image_path}` }}
                            style={styles.overrideThumb}
                            resizeMode="cover"
                          />
                        )}
                        <View style={styles.overrideActions}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn, actioningId === student.pending_override.request_id && { opacity: 0.5 }]}
                            onPress={() => handleReject(student.pending_override!.request_id)}
                            disabled={actioningId !== null}
                          >
                            {actioningId === student.pending_override.request_id
                              ? <ActivityIndicator color={Colors.danger} size="small" />
                              : <Text style={styles.rejectBtnText}>REJECT</Text>
                            }
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.approveBtn, actioningId === student.pending_override.request_id && { opacity: 0.5 }]}
                            onPress={() => handleApprove(student.pending_override!.request_id)}
                            disabled={actioningId !== null}
                          >
                            {actioningId === student.pending_override.request_id
                              ? <ActivityIndicator color={Colors.success} size="small" />
                              : <Text style={styles.approveBtnText}>APPROVE</Text>
                            }
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </GlassCard>
                );
              })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080C14' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#0c1220',
  },
  backBtn: { paddingVertical: 4, paddingRight: Spacing.sm },
  backText: { fontFamily: Typography.fontMonoBold, fontSize: 10, letterSpacing: 1, color: Colors.accent },
  headerRight: { flexDirection: 'row', gap: Spacing.sm },
  closeBtn: {
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  closeBtnText: { fontFamily: Typography.fontMonoBold, fontSize: 9, letterSpacing: 1, color: Colors.danger },
  deleteBtn: {
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  deleteBtnText: { fontFamily: Typography.fontMonoBold, fontSize: 9, letterSpacing: 1, color: '#ef4444' },

  sessionInfoBar: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#0c1220',
    gap: 4,
  },
  codeSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: 4 },
  bigCode: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 24,
    letterSpacing: 4,
    color: Colors.accent,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  statusBadgeText: { fontFamily: Typography.fontMonoBold, fontSize: 9, letterSpacing: 1 },
  sessionName: {
    fontFamily: Typography.fontHeading,
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  sessionExp: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  statChip: {
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 60,
  },
  statNum: { fontFamily: Typography.fontMonoBold, fontSize: 18, color: Colors.textPrimary },
  statLbl: { fontFamily: Typography.fontMono, fontSize: 8, color: Colors.textDim, letterSpacing: 1 },
  syncText: {
    fontFamily: Typography.fontMono,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 1,
    marginTop: 6,
  },

  errorBanner: {
    marginHorizontal: Spacing.xl,
    marginVertical: Spacing.sm,
    backgroundColor: Colors.dangerBg,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  errorText: { fontFamily: Typography.fontBody, fontSize: 12, color: Colors.danger },

  scroll: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: 48 },
  center: { paddingVertical: 64, alignItems: 'center' },

  emptyCard: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyTitle: { fontFamily: Typography.fontHeading, fontSize: 15, color: Colors.textSecondary, marginBottom: 6 },
  emptySub: { fontFamily: Typography.fontBody, fontSize: 13, color: Colors.textDim, textAlign: 'center' },
  emptyCode: { fontFamily: Typography.fontMonoBold, color: Colors.accent, fontSize: 14 },

  // Student card
  studentCard: { borderLeftWidth: 3, padding: Spacing.md, gap: Spacing.sm },
  studentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  studentName: { fontFamily: Typography.fontHeading, fontSize: 14, fontWeight: 'bold', color: Colors.textPrimary, flex: 1 },
  statusBadgeSmall: { borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  statusBadgeSmallText: { fontFamily: Typography.fontMonoBold, fontSize: 8, letterSpacing: 0.5 },
  stepInfo: { fontFamily: Typography.fontMono, fontSize: 10, color: Colors.textSecondary, letterSpacing: 1 },
  stepPct: { fontFamily: Typography.fontMonoBold, fontSize: 10 },
  progressTrack: { height: 3, backgroundColor: Colors.border, borderRadius: 2 },
  progressFill: { height: 3, borderRadius: 2 },

  // Override box
  overrideBox: {
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.warning,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  overrideLabel: { fontFamily: Typography.fontMonoBold, fontSize: 9, letterSpacing: 1.5, color: Colors.warning },
  overrideDesc: { fontFamily: Typography.fontBody, fontSize: 12, color: Colors.textSecondary },
  overrideThumb: { width: '100%', height: 160, borderRadius: BorderRadius.sm },
  overrideActions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.sm, paddingVertical: Spacing.md, alignItems: 'center' },
  rejectBtn: { borderColor: Colors.danger },
  rejectBtnText: { fontFamily: Typography.fontMonoBold, fontSize: 11, letterSpacing: 1, color: Colors.danger },
  approveBtn: { borderColor: Colors.success, backgroundColor: Colors.successBg },
  approveBtnText: { fontFamily: Typography.fontMonoBold, fontSize: 11, letterSpacing: 1, color: Colors.success },
});
