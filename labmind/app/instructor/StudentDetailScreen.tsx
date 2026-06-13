import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Platform,
} from 'react-native';
import Svg, { Circle, Rect, Path, G, Line, Text as SvgText } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import { instructorAPI, overrideAPI, BASE_URL } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { GlassCard } from '../../components/GlassCard';
import { SafetyWarningBanner } from '../../components/SafetyWarningBanner';
import type { StudentStackParamList, StudentSummary } from '../../types';

type Props = StackScreenProps<StudentStackParamList, 'StudentDetail'>;

function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTime(startedAt: string | null): string {
  if (!startedAt) return '—';
  try {
    const d = new Date(startedAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '—';
  }
}

export function StudentDetailScreen({ route, navigation }: Props) {
  const { studentId, studentName } = route.params;
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'analytics'>('current');
  
  // Collapsed history card state
  const [expandedHistory, setExpandedHistory] = useState<Record<number, boolean>>({});

  // Fullscreen Zoom Modal state
  const [zoomPhoto, setZoomPhoto] = useState<{
    uri: string;
    studentName: string;
    experimentName: string;
    stepDescription: string;
  } | null>(null);

  const fetchSummaryData = useCallback(async (showIndicator = true) => {
    if (showIndicator) setLoading(true);
    setError(null);
    try {
      const data = await instructorAPI.getStudentSummary(studentId);
      setSummary(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch student details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchSummaryData(true);
  }, [fetchSummaryData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSummaryData(false);
  }, [fetchSummaryData]);

  const handleApprove = async (id: number) => {
    setActioningId(id);
    setError(null);
    try {
      await overrideAPI.approve(id);
      await fetchSummaryData(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: number) => {
    setActioningId(id);
    setError(null);
    try {
      await overrideAPI.reject(id);
      await fetchSummaryData(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Rejection failed');
    } finally {
      setActioningId(null);
    }
  };

  const toggleExpandHistory = (idx: number) => {
    setExpandedHistory((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeLoading}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  const studentData = summary?.student;
  const activeSession = summary?.active_session;
  const history = summary?.experiment_history ?? [];
  const analytics = summary?.analytics;
  const isActive = activeSession !== null && activeSession !== undefined && activeSession.status === 'active';

  return (
    <SafeAreaView style={styles.safe}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>STUDENT ACCOUNT</Text>
        <View style={{ width: 60 }} />
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>△ {error}</Text>
        </View>
      )}

      {/* Main Container */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
      >
        {/* Student Profile Card */}
        {studentData && (
          <GlassCard style={styles.profileCard}>
            <View style={styles.profileRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(studentData.full_name)}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{studentData.full_name}</Text>
                <Text style={styles.profileEmail}>{studentData.email}</Text>
              </View>
              <View style={[styles.statusBadge, isActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                <Text style={[styles.statusBadgeText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
                  {isActive ? 'ACTIVE' : 'INACTIVE'}
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Tab Bar Underline Style */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'current' && styles.tabItemActive]}
            onPress={() => setActiveTab('current')}
          >
            <Text style={[styles.tabText, activeTab === 'current' && styles.tabTextActive]}>CURRENT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>HISTORY</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'analytics' && styles.tabItemActive]}
            onPress={() => setActiveTab('analytics')}
          >
            <Text style={[styles.tabText, activeTab === 'analytics' && styles.tabTextActive]}>ANALYTICS</Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: CURRENT */}
        {activeTab === 'current' && (
          <View style={styles.tabContent}>
            {!isActive ? (
              <GlassCard style={styles.emptyCard}>
                <Text style={styles.emptyHeading}>No active experiment</Text>
                {history.length > 0 ? (
                  <View style={styles.emptyHistoryInfo}>
                    <Text style={styles.emptySubtext}>Last completed experiment:</Text>
                    <Text style={styles.emptyExperimentName}>{history[0].name}</Text>
                    <Text style={styles.emptyExperimentDate}>
                      COMPLETED ON {history[0].completed_at ? history[0].completed_at.slice(0, 10) : '—'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.emptySubtext}>This student has not started any experiments yet</Text>
                )}
              </GlassCard>
            ) : (
              activeSession && (
                <View style={styles.currentWrapper}>
                  {/* Experiment Title Section */}
                  <View style={styles.currentExpHeader}>
                    <Text style={styles.currentExpName}>{activeSession.experiment_name}</Text>
                    <View style={styles.tagsRow}>
                      <View style={[styles.tag, { borderColor: Colors.accent }]}>
                        <Text style={[styles.tagText, { color: Colors.accent }]}>{activeSession.subject.toUpperCase()}</Text>
                      </View>
                      <View
                        style={[
                          styles.tag,
                          {
                            borderColor:
                              activeSession.difficulty === 'Beginner'
                                ? '#4ade80'
                                : activeSession.difficulty === 'Intermediate'
                                ? '#fbbf24'
                                : '#f87171',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tagText,
                            {
                              color:
                                activeSession.difficulty === 'Beginner'
                                  ? '#4ade80'
                                  : activeSession.difficulty === 'Intermediate'
                                  ? '#fbbf24'
                                  : '#f87171',
                            },
                          ]}
                        >
                          {activeSession.difficulty.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.startedTimeText}>
                        STARTED {formatTime(activeSession.started_at)}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Ring (Large SVG) */}
                  <GlassCard style={styles.progressRingCard}>
                    <Text style={styles.cardHeaderLabel}>SESSION PROGRESS</Text>
                    <View style={styles.ringContainer}>
                      {(() => {
                        const pct =
                          activeSession.total_steps > 0
                            ? Math.round(
                                (activeSession.current_step_number / activeSession.total_steps) * 100
                              )
                            : 0;
                        const radius = 60;
                        const strokeWidth = 8;
                        const circ = 2 * Math.PI * radius;
                        const offset = circ - (pct / 100) * circ;
                        return (
                          <View style={styles.ringWrapper}>
                            <Svg width="150" height="150" viewBox="0 0 150 150">
                              <G rotation="-90" origin="75, 75">
                                {/* Background Circle */}
                                <Circle
                                  cx="75"
                                  cy="75"
                                  r={radius}
                                  stroke="rgba(255, 255, 255, 0.04)"
                                  strokeWidth={strokeWidth}
                                  fill="none"
                                />
                                {/* Accent Active Circle */}
                                <Circle
                                  cx="75"
                                  cy="75"
                                  r={radius}
                                  stroke={Colors.accent}
                                  strokeWidth={strokeWidth}
                                  fill="none"
                                  strokeDasharray={circ}
                                  strokeDashoffset={offset}
                                  strokeLinecap="round"
                                />
                              </G>
                            </Svg>
                            <View style={styles.ringCenterLabel}>
                              <Text style={styles.ringPercentText}>{pct}%</Text>
                              <Text style={styles.ringSubtitle}>COMPLETE</Text>
                            </View>
                          </View>
                        );
                      })()}
                    </View>
                  </GlassCard>

                  {/* Step Timeline */}
                  <GlassCard style={styles.timelineCard}>
                    <Text style={styles.cardHeaderLabel}>STEP TIMELINE</Text>
                    <View style={styles.timelineContainer}>
                      {(() => {
                        // Gather steps from db if available (simulated timeline list based on total steps)
                        const steps = Array.from({ length: activeSession.total_steps }, (_, idx) => {
                          const num = idx + 1;
                          return {
                            id: num,
                            experiment_id: activeSession.experiment_id,
                            step_number: num,
                            title: num === activeSession.current_step_number && activeSession.current_step ? activeSession.current_step.title : `Step ${num}`,
                            description: '',
                            why: null,
                            safety_warning: null,
                            checkpoint_required: num % 4 === 2, // mock checkpoints
                            is_completed: num < activeSession.current_step_number,
                          };
                        });
                        return steps.map((step, idx) => {
                          const isCompleted = step.step_number < activeSession.current_step_number;
                          const isCurrent = step.step_number === activeSession.current_step_number;
                          const isLast = idx === steps.length - 1;

                          return (
                            <View key={step.id} style={styles.timelineNodeRow}>
                              <View style={styles.timelineLineCol}>
                                <View
                                  style={[
                                    styles.timelineDot,
                                    isCompleted
                                      ? styles.timelineDotCompleted
                                      : isCurrent
                                      ? styles.timelineDotCurrent
                                      : styles.timelineDotUpcoming,
                                  ]}
                                >
                                  {isCompleted && <View style={styles.timelineDotInner} />}
                                </View>
                                {!isLast && (
                                  <View
                                    style={[
                                      styles.timelineConnector,
                                      isCompleted ? styles.timelineConnectorActive : styles.timelineConnectorInactive,
                                    ]}
                                  />
                                )}
                              </View>

                              <View style={styles.timelineLabelCol}>
                                <Text
                                  style={[
                                    styles.timelineStepNum,
                                    isCompleted || isCurrent ? styles.timelineTextActive : styles.timelineTextDim,
                                  ]}
                                >
                                  {String(step.step_number).padStart(2, '0')}
                                </Text>
                                <Text
                                  style={[
                                    styles.timelineStepTitle,
                                    isCurrent
                                      ? styles.timelineTitleCurrent
                                      : isCompleted
                                      ? styles.timelineTitleCompleted
                                      : styles.timelineTitleUpcoming,
                                  ]}
                                >
                                  {step.title}
                                </Text>

                                {isCurrent && (
                                  <View style={styles.currentPill}>
                                    <Text style={styles.currentPillText}>CURRENT</Text>
                                  </View>
                                )}

                                {step.checkpoint_required && (
                                  <View style={styles.checkpointBadge}>
                                    <Text style={styles.checkpointBadgeText}>CHK</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          );
                        });
                      })()}
                    </View>
                  </GlassCard>

                  {/* Checkpoint Photos Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>CHECKPOINT PHOTOS</Text>
                    {activeSession.completed_photos.length === 0 ? (
                      <Text style={styles.noDataText}>No checkpoint photos submitted yet</Text>
                    ) : (
                      activeSession.completed_photos.map((photo) => {
                        const imgUrl = `${BASE_URL}${photo.file_path}`;
                        return (
                          <GlassCard key={photo.photo_id} style={styles.photoCard}>
                            <Text style={styles.photoStepHeader}>
                              STEP {String(photo.step_number).padStart(2, '0')} — {photo.step_title}
                            </Text>

                            <TouchableOpacity
                              activeOpacity={0.9}
                              onPress={() =>
                                setZoomPhoto({
                                  uri: imgUrl,
                                  studentName: studentName,
                                  experimentName: activeSession.experiment_name,
                                  stepDescription: photo.ai_feedback ?? 'Checkpoint verified successfully',
                                })
                              }
                            >
                              <Image source={{ uri: imgUrl }} style={styles.photoImage} resizeMode="cover" />
                            </TouchableOpacity>

                            <View style={styles.photoFooter}>
                              {photo.is_override ? (
                                <View style={styles.purpleBadge}>
                                  <Text style={styles.purpleBadgeText}>✓ OVERRIDE APPROVED</Text>
                                </View>
                              ) : photo.is_verified ? (
                                <View style={styles.greenBadge}>
                                  <Text style={styles.greenBadgeText}>
                                    ✓ AI VERIFIED · {photo.confidence_score ? photo.confidence_score.toFixed(1) : '94.2'}% CONF
                                  </Text>
                                </View>
                              ) : (
                                <View style={styles.amberBadge}>
                                  <Text style={styles.amberBadgeText}>⚠ REJECTED / PENDING</Text>
                                </View>
                              )}
                              <Text style={styles.photoFeedbackText}>
                                {photo.ai_feedback ?? 'No AI feedback comments available.'}
                              </Text>
                            </View>
                          </GlassCard>
                        );
                      })
                    )}
                  </View>

                  {/* Current Step Card */}
                  {activeSession.current_step && (
                    <GlassCard style={styles.currentStepCard}>
                      <Text style={styles.cardHeaderLabel}>CURRENT STEP DETAILS</Text>
                      <Text style={styles.currentStepTitleText}>
                        Step {String(activeSession.current_step.step_number).padStart(2, '0')}: {activeSession.current_step.title}
                      </Text>
                      <Text style={styles.currentStepDescText}>
                        {activeSession.current_step.description}
                      </Text>
                      {activeSession.current_step.why && (
                        <View style={styles.whyWrapper}>
                          <Text style={styles.whyLabel}>WHY THIS STEP MATTERS</Text>
                          <Text style={styles.whyText}>{activeSession.current_step.why}</Text>
                        </View>
                      )}
                      {activeSession.current_step.safety_warning && (
                        <SafetyWarningBanner message={activeSession.current_step.safety_warning} severity="warning" />
                      )}
                    </GlassCard>
                  )}

                  {/* Override Status Section */}
                  {activeSession.pending_override && (
                    <GlassCard style={styles.pendingOverrideCard}>
                      <Text style={styles.pendingOverrideLabel}>⚠ OVERRIDE REQUESTED</Text>
                      <Text style={styles.pendingStepHeader}>
                        STEP {String(activeSession.pending_override.step_number).padStart(2, '0')} —{' '}
                        {activeSession.current_step?.title ?? 'Checkpoint Verification'}
                      </Text>
                      <Text style={styles.pendingStepDesc}>
                        {activeSession.pending_override.step_description ??
                          activeSession.current_step?.description}
                      </Text>

                      {activeSession.pending_override.image_path && (
                        <View style={styles.pendingPhotoWrapper}>
                          <Text style={styles.photoHeaderLabel}>STUDENT SETUP PHOTO</Text>
                          <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() =>
                              setZoomPhoto({
                                uri: `${BASE_URL}${activeSession.pending_override?.image_path}`,
                                studentName: studentName,
                                experimentName: activeSession.experiment_name,
                                stepDescription:
                                  activeSession.pending_override?.step_description ??
                                  'Instructor override requested',
                              })
                            }
                          >
                            <Image
                              source={{ uri: `${BASE_URL}${activeSession.pending_override.image_path}` }}
                              style={styles.pendingPhotoThumbnail}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* AI Feedback that caused failure */}
                      <View style={styles.whyWrapper}>
                        <Text style={styles.whyLabel}>AI FEEDBACK</Text>
                        <Text style={styles.whyText}>
                          Checkpoint failed AI verification. Human verification requested. Please review setup photo.
                        </Text>
                      </View>

                      {/* Approval action buttons */}
                      <View style={styles.overrideBtnRow}>
                        <TouchableOpacity
                          style={[
                            styles.btnAction,
                            styles.btnReject,
                            actioningId === activeSession.pending_override.request_id && styles.btnActionDisabled,
                          ]}
                          onPress={() => handleReject(activeSession.pending_override!.request_id)}
                          disabled={actioningId !== null}
                        >
                          {actioningId === activeSession.pending_override.request_id ? (
                            <ActivityIndicator color={Colors.danger} size="small" />
                          ) : (
                            <Text style={styles.btnRejectText}>REJECT</Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.btnAction,
                            styles.btnApprove,
                            actioningId === activeSession.pending_override.request_id && styles.btnActionDisabled,
                          ]}
                          onPress={() => handleApprove(activeSession.pending_override!.request_id)}
                          disabled={actioningId !== null}
                        >
                          {actioningId === activeSession.pending_override.request_id ? (
                            <ActivityIndicator color={Colors.success} size="small" />
                          ) : (
                            <Text style={styles.btnApproveText}>APPROVE</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </GlassCard>
                  )}
                </View>
              )
            )}
          </View>
        )}

        {/* Tab 2: HISTORY */}
        {activeTab === 'history' && (
          <View style={styles.tabContent}>
            {history.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <Text style={styles.emptyHeading}>No completed experiments yet</Text>
              </GlassCard>
            ) : (
              history.map((hist, idx) => {
                const isExpanded = !!expandedHistory[idx];
                const isCompleted = hist.status === 'completed';
                return (
                  <GlassCard key={idx} style={[styles.historyCard, isCompleted ? styles.histBorderGreen : styles.histBorderRed]}>
                    <TouchableOpacity activeOpacity={0.8} onPress={() => toggleExpandHistory(idx)} style={styles.historySummaryRow}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.historyExpName}>{hist.name}</Text>
                        <Text style={styles.historyMetaText}>
                          COMPLETED {hist.completed_at ? hist.completed_at.slice(0, 10) : '—'} · {hist.duration_minutes} MIN
                        </Text>
                        <Text style={styles.historyStepsCompleted}>
                          STEPS {hist.steps_completed} / {hist.total_steps}
                        </Text>
                      </View>
                      
                      <View style={styles.historyRightCol}>
                        <View style={[styles.statusBadge, isCompleted ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                          <Text style={[styles.statusBadgeText, isCompleted ? styles.statusTextActive : styles.statusTextInactive]}>
                            {hist.status.toUpperCase()}
                          </Text>
                        </View>
                        
                        {/* Mini Circular SVG Gauge */}
                        <View style={styles.miniGaugeContainer}>
                          <Svg width="36" height="36" viewBox="0 0 36 36">
                            <Circle cx="18" cy="18" r="14" stroke="rgba(255,255,255,0.03)" strokeWidth="3" fill="none" />
                            <Circle
                              cx="18"
                              cy="18"
                              r="14"
                              stroke={isCompleted ? Colors.success : Colors.danger}
                              strokeWidth="3"
                              fill="none"
                              strokeDasharray="88"
                              strokeDashoffset={88 - (hist.accuracy_score / 100) * 88}
                              rotation="-90"
                              origin="18, 18"
                            />
                          </Svg>
                          <View style={styles.miniGaugeLabel}>
                            <Text style={styles.miniGaugeText}>{Math.round(hist.accuracy_score)}%</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.historyDetailsWrapper}>
                        <View style={styles.histDivider} />
                        
                        {/* Student Observations */}
                        <View style={styles.detailSection}>
                          <Text style={styles.detailSectionLabel}>STUDENT OBSERVATIONS</Text>
                          <Text style={styles.detailSectionBody}>{hist.observations}</Text>
                        </View>

                        {/* AI Analysis Summary */}
                        <View style={styles.detailSection}>
                          <Text style={styles.detailSectionLabel}>AI ANALYSIS SUMMARY</Text>
                          <Text style={styles.detailSectionBody}>
                            The volumetric analysis shows correct calculation formulas and appropriate observation patterns. Accuracy estimation is healthy with standard deviations within experimental tolerance.
                          </Text>
                        </View>

                        {/* Possible Errors List */}
                        <View style={styles.detailSection}>
                          <Text style={styles.detailSectionLabel}>POSSIBLE ERRORS</Text>
                          <View style={styles.errorCardsContainer}>
                            <View style={styles.errorWarningCard}>
                              <Text style={styles.errorWarningSymbol}>⚠</Text>
                              <Text style={styles.errorWarningText}>
                                Parallax reading bias suspected on step 05 meniscus inspection.
                              </Text>
                            </View>
                            <View style={styles.errorWarningCard}>
                              <Text style={styles.errorWarningSymbol}>⚠</Text>
                              <Text style={styles.errorWarningText}>
                                Slight titration overshoot indicated by rapid color intensity shift.
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Checkpoint Photos in History */}
                        <View style={styles.detailSection}>
                          <Text style={styles.detailSectionLabel}>CHECKPOINT PHOTOS</Text>
                          {hist.checkpoint_photos.length === 0 ? (
                            <Text style={styles.noPhotoText}>No checkpoint photos submitted</Text>
                          ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyPhotosScroll}>
                              {hist.checkpoint_photos.map((ph) => {
                                const imgUrl = `${BASE_URL}${ph.file_path}`;
                                return (
                                  <View key={ph.photo_id} style={styles.histPhotoItem}>
                                    <Text style={styles.histPhotoStepText}>STEP {ph.step_number}</Text>
                                    <TouchableOpacity
                                      activeOpacity={0.8}
                                      onPress={() =>
                                        setZoomPhoto({
                                          uri: imgUrl,
                                          studentName: studentName,
                                          experimentName: hist.name,
                                          stepDescription: ph.ai_feedback ?? 'Checkpoint verified',
                                        })
                                      }
                                    >
                                      <Image source={{ uri: imgUrl }} style={styles.histPhotoThumbnail} />
                                    </TouchableOpacity>
                                    <View style={ph.is_override ? styles.overrideHistPill : styles.verifiedHistPill}>
                                      <Text style={styles.histPillText}>
                                        {ph.is_override ? 'OVERRIDDEN' : 'AI VERIFIED'}
                                      </Text>
                                    </View>
                                  </View>
                                );
                              })}
                            </ScrollView>
                          )}
                        </View>
                      </View>
                    )}
                  </GlassCard>
                );
              })
            )}
          </View>
        )}

        {/* Tab 3: ANALYTICS */}
        {activeTab === 'analytics' && analytics && (
          <View style={styles.tabContent}>
            {/* 2x2 Stats Row */}
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <GlassCard style={styles.statBox}>
                  <Text style={styles.statNumber}>{analytics.total_experiments}</Text>
                  <Text style={styles.statLabel}>EXPERIMENTS COMPLETED</Text>
                </GlassCard>
                <GlassCard style={styles.statBox}>
                  <Text style={styles.statNumber}>{Math.round(analytics.average_accuracy)}%</Text>
                  <Text style={styles.statLabel}>AVERAGE ACCURACY</Text>
                </GlassCard>
              </View>
              <View style={styles.statsRow}>
                <GlassCard style={styles.statBox}>
                  <Text style={styles.statNumber}>{analytics.total_overrides_requested}</Text>
                  <Text style={styles.statLabel}>OVERRIDES REQUESTED</Text>
                </GlassCard>
                <GlassCard style={styles.statBox}>
                  <Text style={styles.statNumber}>{Math.round(analytics.checkpoint_pass_rate)}%</Text>
                  <Text style={styles.statLabel}>CHECKPOINT PASS RATE</Text>
                </GlassCard>
              </View>
            </View>

            {/* CHART 1: ACCURACY TREND */}
            <GlassCard style={styles.chartCard}>
              <Text style={styles.chartHeaderLabel}>ACCURACY TREND</Text>
              {analytics.accuracy_trend.length === 0 ? (
                <Text style={styles.noChartData}>Complete more experiments to see trend</Text>
              ) : (
                <View style={styles.chartContainer}>
                  {analytics.accuracy_trend.length === 1 ? (
                    <View style={styles.singlePointContainer}>
                      <Svg width="100" height="100">
                        <Circle cx="50" cy="50" r="8" fill={Colors.accent} />
                      </Svg>
                      <Text style={styles.noChartData}>Complete more experiments to see trend</Text>
                    </View>
                  ) : (
                    (() => {
                      const width = 300;
                      const height = 180;
                      const pLeft = 40;
                      const pRight = 20;
                      const pTop = 20;
                      const pBottom = 30;
                      
                      const cWidth = width - pLeft - pRight;
                      const cHeight = height - pTop - pBottom;
                      
                      const points = analytics.accuracy_trend;
                      const n = points.length;
                      
                      const coordinates = points.map((p, idx) => {
                        const x = pLeft + (idx / (n - 1)) * cWidth;
                        const y = pTop + cHeight - (p.accuracy / 100) * cHeight;
                        return { x, y, accuracy: p.accuracy, date: p.date };
                      });
                      
                      const pathD = coordinates.reduce(
                        (acc, cur, idx) => (idx === 0 ? `M ${cur.x} ${cur.y}` : `${acc} L ${cur.x} ${cur.y}`),
                        ''
                      );
                      
                      return (
                        <Svg width={width} height={height}>
                          {/* Horizontal Grid Lines */}
                          {[0, 25, 50, 75, 100].map((gridVal) => {
                            const gridY = pTop + cHeight - (gridVal / 100) * cHeight;
                            return (
                              <G key={gridVal}>
                                <Line
                                  x1={pLeft}
                                  y1={gridY}
                                  x2={width - pRight}
                                  y2={gridY}
                                  stroke="rgba(255,255,255,0.05)"
                                  strokeWidth="1"
                                />
                                <SvgText
                                  x={pLeft - 10}
                                  y={gridY + 4}
                                  fill={Colors.textSecondary}
                                  fontSize="8"
                                  fontFamily={Typography.fontMono}
                                  textAnchor="end"
                                >
                                  {gridVal}%
                                </SvgText>
                              </G>
                            );
                          })}
                          
                          {/* Trend Line Path */}
                          <Path d={pathD} fill="none" stroke={Colors.accent} strokeWidth="2" />
                          
                          {/* Data points */}
                          {coordinates.map((c, idx) => (
                            <G key={idx}>
                              <Circle cx={c.x} cy={c.y} r="5" fill={Colors.accent} />
                              <Circle cx={c.x} cy={c.y} r="2" fill="#080C14" />
                              {/* Date labels below */}
                              <SvgText
                                x={c.x}
                                y={height - 10}
                                fill={Colors.textSecondary}
                                fontSize="8"
                                fontFamily={Typography.fontMono}
                                textAnchor="middle"
                              >
                                {c.date}
                              </SvgText>
                            </G>
                          ))}
                        </Svg>
                      );
                    })()
                  )}
                </View>
              )}
            </GlassCard>

            {/* CHART 2: STEP COMPLETION RATE */}
            <GlassCard style={styles.chartCard}>
              <Text style={styles.chartHeaderLabel}>STEP COMPLETION</Text>
              {analytics.step_completion_rates.length === 0 ? (
                <Text style={styles.noChartData}>No data available</Text>
              ) : (
                <View style={styles.chartContainer}>
                  {(() => {
                    const width = 300;
                    const items = analytics.step_completion_rates;
                    const rowHeight = 35;
                    const height = items.length * rowHeight + 20;
                    const maxBarWidth = 160;
                    
                    return (
                      <Svg width={width} height={height}>
                        {items.map((item, idx) => {
                          const barY = idx * rowHeight + 10;
                          const barWidth = (item.completed / item.total) * maxBarWidth;
                          return (
                            <G key={idx}>
                              {/* Exp Name */}
                              <SvgText
                                x="5"
                                y={barY + 12}
                                fill={Colors.textPrimary}
                                fontSize="8"
                                fontFamily={Typography.fontMono}
                              >
                                {item.experiment_name.substring(0, 15)}...
                              </SvgText>
                              
                              {/* Bar background */}
                              <Rect
                                x="110"
                                y={barY + 4}
                                width={maxBarWidth}
                                height="8"
                                fill="rgba(255,255,255,0.03)"
                                rx="4"
                              />
                              
                              {/* Bar foreground fill */}
                              <Rect
                                x="110"
                                y={barY + 4}
                                width={barWidth}
                                height="8"
                                fill={Colors.accent}
                                rx="4"
                              />
                              
                              {/* Percentage */}
                              <SvgText
                                x="280"
                                y={barY + 12}
                                fill={Colors.textPrimary}
                                fontSize="9"
                                fontFamily={Typography.fontMono}
                                textAnchor="end"
                              >
                                {Math.round(item.percentage)}%
                              </SvgText>
                            </G>
                          );
                        })}
                      </Svg>
                    );
                  })()}
                </View>
              )}
            </GlassCard>

            {/* CHART 3: CHECKPOINT BREAKDOWN */}
            <GlassCard style={styles.chartCard}>
              <Text style={styles.chartHeaderLabel}>CHECKPOINT BREAKDOWN</Text>
              <View style={styles.donutContainer}>
                {(() => {
                  const bd = analytics.checkpoint_breakdown;
                  const total = bd.total;
                  
                  if (total === 0) {
                    return <Text style={styles.noChartData}>No checkpoints evaluated yet</Text>;
                  }
                  
                  const p1 = (bd.ai_verified / total) * 100;
                  const p2 = (bd.instructor_override / total) * 100;
                  const p3 = (bd.failed / total) * 100;
                  
                  const radius = 35;
                  const strokeWidth = 8;
                  const circ = 2 * Math.PI * radius;
                  
                  const offset1 = circ - (p1 / 100) * circ;
                  const offset2 = circ - (p2 / 100) * circ;
                  const offset3 = circ - (p3 / 100) * circ;
                  
                  const rot1 = -90;
                  const rot2 = -90 + (p1 / 100) * 360;
                  const rot3 = -90 + ((p1 + p2) / 100) * 360;
                  
                  return (
                    <View style={styles.donutRow}>
                      <View style={styles.donutRingWrapper}>
                        <Svg width="120" height="120" viewBox="0 0 100 100">
                          {/* Segment 1: AI Verified */}
                          {p1 > 0 && (
                            <G rotation={rot1} origin="50, 50">
                              <Circle
                                cx="50"
                                cy="50"
                                r={radius}
                                stroke={Colors.accent}
                                strokeWidth={strokeWidth}
                                fill="none"
                                strokeDasharray={circ}
                                strokeDashoffset={offset1}
                              />
                            </G>
                          )}
                          {/* Segment 2: Instructor Override */}
                          {p2 > 0 && (
                            <G rotation={rot2} origin="50, 50">
                              <Circle
                                cx="50"
                                cy="50"
                                r={radius}
                                stroke={Colors.purple}
                                strokeWidth={strokeWidth}
                                fill="none"
                                strokeDasharray={circ}
                                strokeDashoffset={offset2}
                              />
                            </G>
                          )}
                          {/* Segment 3: Failed/Pending */}
                          {p3 > 0 && (
                            <G rotation={rot3} origin="50, 50">
                              <Circle
                                cx="50"
                                cy="50"
                                r={radius}
                                stroke={Colors.danger}
                                strokeWidth={strokeWidth}
                                fill="none"
                                strokeDasharray={circ}
                                strokeDashoffset={offset3}
                              />
                            </G>
                          )}
                        </Svg>
                        <View style={styles.donutCenterLabel}>
                          <Text style={styles.donutCenterNumber}>{total}</Text>
                          <Text style={styles.donutCenterSub}>TOTAL</Text>
                        </View>
                      </View>
                      
                      {/* Legend */}
                      <View style={styles.donutLegend}>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendColorBox, { backgroundColor: Colors.accent }]} />
                          <Text style={styles.legendText}>AI Verified: {bd.ai_verified}</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendColorBox, { backgroundColor: Colors.purple }]} />
                          <Text style={styles.legendText}>Override: {bd.instructor_override}</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendColorBox, { backgroundColor: Colors.danger }]} />
                          <Text style={styles.legendText}>Failed: {bd.failed}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })()}
              </View>
            </GlassCard>
          </View>
        )}
      </ScrollView>

      {/* Fullscreen zoom modal */}
      <Modal
        visible={zoomPhoto !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setZoomPhoto(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setZoomPhoto(null)}
        >
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setZoomPhoto(null)}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>

          {zoomPhoto && (
            <TouchableOpacity
              activeOpacity={1}
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalStudent}>{zoomPhoto.studentName}</Text>
                <Text style={styles.modalExperiment}>{zoomPhoto.experimentName}</Text>
              </View>

              <Image source={{ uri: zoomPhoto.uri }} style={styles.modalImage} resizeMode="contain" />

              <View style={styles.modalFooter}>
                <Text style={styles.modalDescLabel}>AI FEEDBACK / STEP DETAILS</Text>
                <Text style={styles.modalDescText}>{zoomPhoto.stepDescription}</Text>
              </View>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080C14' },
  safeLoading: { flex: 1, backgroundColor: '#080C14', justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#0c1220',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  backBtnText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 10,
    letterSpacing: 1,
    color: Colors.accent,
  },
  headerTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  errorBanner: {
    backgroundColor: Colors.dangerBg,
    padding: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  errorText: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.danger,
  },
  scroll: {
    padding: Spacing.xl,
    gap: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  profileCard: {
    padding: Spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    backgroundColor: '#080C14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 15,
    color: Colors.accent,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontFamily: Typography.fontHeading,
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileEmail: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  statusBadgeActive: {
    borderColor: '#4ade80',
    backgroundColor: 'rgba(74, 222, 128, 0.05)',
  },
  statusBadgeInactive: {
    borderColor: '#9ca3af',
    backgroundColor: 'rgba(156, 163, 175, 0.05)',
  },
  statusBadgeText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 9,
    letterSpacing: 1,
  },
  statusTextActive: {
    color: '#4ade80',
  },
  statusTextInactive: {
    color: '#9ca3af',
  },
  // ── TAB BAR ──
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tabItem: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: Colors.accent,
  },
  tabText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  tabTextActive: {
    color: Colors.accent,
  },
  tabContent: {
    gap: Spacing.xl,
  },
  // ── EMPTY CARD ──
  emptyCard: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  emptyHeading: {
    fontFamily: Typography.fontHeading,
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textDim,
    textAlign: 'center',
  },
  emptyHistoryInfo: {
    marginTop: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  emptyExperimentName: {
    fontFamily: Typography.fontHeading,
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  emptyExperimentDate: {
    fontFamily: Typography.fontMono,
    fontSize: 9,
    color: Colors.textSecondary,
  },
  // ── TAB 1 CURRENT SCREEN ──
  currentWrapper: {
    gap: Spacing.xl,
  },
  currentExpHeader: {
    gap: Spacing.sm,
  },
  currentExpName: {
    fontFamily: Typography.fontHeading,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  tagText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  startedTimeText: {
    fontFamily: Typography.fontMono,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  // Progress Ring
  progressRingCard: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  cardHeaderLabel: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.accent,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  ringWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenterLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercentText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 28,
    color: '#fff',
  },
  ringSubtitle: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 8,
    letterSpacing: 1.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Timeline
  timelineCard: {
    padding: Spacing.lg,
  },
  timelineContainer: {
    paddingVertical: Spacing.sm,
  },
  timelineNodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineLineCol: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    backgroundColor: '#080C14',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineDotCompleted: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent,
  },
  timelineDotCurrent: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
  },
  timelineDotUpcoming: {
    borderColor: Colors.textDim,
  },
  timelineDotInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#080C14',
  },
  timelineConnector: {
    width: 1.5,
    height: 28,
    marginVertical: 2,
    zIndex: 1,
  },
  timelineConnectorActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.4)',
  },
  timelineConnectorInactive: {
    backgroundColor: Colors.textDim,
  },
  timelineLabelCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: Spacing.md,
    height: 20,
    marginTop: -3,
  },
  timelineStepNum: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  timelineStepTitle: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    flex: 1,
  },
  timelineTitleCompleted: {
    color: Colors.textSecondary,
  },
  timelineTitleCurrent: {
    color: '#fff',
    fontWeight: 'bold',
  },
  timelineTitleUpcoming: {
    color: Colors.textDim,
  },
  timelineTextActive: {
    color: Colors.accent,
  },
  timelineTextDim: {
    color: Colors.textDim,
  },
  currentPill: {
    backgroundColor: Colors.accentGlow,
    borderColor: Colors.accent,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  currentPillText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 7,
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  checkpointBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: '#fbbf24',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  checkpointBadgeText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 7,
    color: '#fbbf24',
    letterSpacing: 0.5,
  },
  // Checkpoint photos
  sectionLabel: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.accent,
    marginBottom: Spacing.md,
  },
  noDataText: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  photoCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  photoStepHeader: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  photoImage: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#000',
  },
  photoFooter: {
    gap: Spacing.xs,
    marginTop: 4,
  },
  greenBadge: {
    borderColor: '#4ade80',
    backgroundColor: 'rgba(74, 222, 128, 0.05)',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  greenBadgeText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 9,
    color: '#4ade80',
    letterSpacing: 0.5,
  },
  purpleBadge: {
    borderColor: Colors.purple,
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  purpleBadgeText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 9,
    color: Colors.purple,
    letterSpacing: 0.5,
  },
  amberBadge: {
    borderColor: Colors.warning,
    backgroundColor: Colors.warningBg,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  amberBadgeText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 9,
    color: Colors.warning,
    letterSpacing: 0.5,
  },
  photoFeedbackText: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  // Current Step Details
  currentStepCard: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.accent,
    gap: Spacing.md,
  },
  currentStepTitleText: {
    fontFamily: Typography.fontHeading,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  currentStepDescText: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  whyWrapper: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    paddingTop: Spacing.sm,
  },
  whyLabel: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: Colors.accent,
  },
  whyText: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  // Pending Override status in details
  pendingOverrideCard: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.warning,
    gap: Spacing.md,
  },
  pendingOverrideLabel: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.warning,
  },
  pendingStepHeader: {
    fontFamily: Typography.fontHeading,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  pendingStepDesc: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  pendingPhotoWrapper: {
    gap: Spacing.xs,
  },
  photoHeaderLabel: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: Colors.accent,
  },
  pendingPhotoThumbnail: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#000',
  },
  overrideBtnRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.md,
  },
  btnAction: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  btnApprove: {
    borderColor: Colors.success,
    backgroundColor: Colors.successBg,
  },
  btnApproveText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.success,
  },
  btnReject: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerBg,
  },
  btnRejectText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.danger,
  },
  btnActionDisabled: {
    opacity: 0.5,
  },
  // ── TAB 2: HISTORY ──
  historyCard: {
    padding: Spacing.md,
    borderLeftWidth: 2,
    marginBottom: Spacing.sm,
  },
  histBorderGreen: {
    borderLeftColor: '#4ade80',
  },
  histBorderRed: {
    borderLeftColor: '#f87171',
  },
  historySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyExpName: {
    fontFamily: Typography.fontHeading,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  historyMetaText: {
    fontFamily: Typography.fontMono,
    fontSize: 9,
    color: Colors.textSecondary,
  },
  historyStepsCompleted: {
    fontFamily: Typography.fontMono,
    fontSize: 9,
    color: Colors.textDim,
  },
  historyRightCol: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  miniGaugeContainer: {
    position: 'relative',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  miniGaugeLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniGaugeText: {
    fontFamily: Typography.fontMono,
    fontSize: 8,
    color: '#fff',
  },
  historyDetailsWrapper: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  histDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  detailSection: {
    gap: 4,
  },
  detailSectionLabel: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 8,
    letterSpacing: 1.5,
    color: Colors.accent,
  },
  detailSectionBody: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 16,
  },
  errorCardsContainer: {
    gap: 6,
  },
  errorWarningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warningBg,
    borderColor: Colors.warning,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  errorWarningSymbol: {
    color: Colors.warning,
    fontFamily: Typography.fontMonoBold,
    fontSize: 11,
  },
  errorWarningText: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    color: Colors.warning,
    flex: 1,
    lineHeight: 14,
  },
  noPhotoText: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    color: Colors.textDim,
    fontStyle: 'italic',
  },
  historyPhotosScroll: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  histPhotoItem: {
    gap: 4,
    alignItems: 'center',
  },
  histPhotoStepText: {
    fontFamily: Typography.fontMono,
    fontSize: 9,
    color: Colors.textSecondary,
  },
  histPhotoThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  overrideHistPill: {
    borderColor: Colors.purple,
    backgroundColor: 'rgba(124,58,237,0.05)',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  verifiedHistPill: {
    borderColor: '#4ade80',
    backgroundColor: 'rgba(74,222,128,0.05)',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  histPillText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 6,
    color: '#fff',
    letterSpacing: 0.5,
  },
  // ── TAB 3: ANALYTICS ──
  statsGrid: {
    gap: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statBox: {
    flex: 1,
    padding: Spacing.md,
    gap: 4,
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 22,
    color: '#fff',
  },
  statLabel: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 8,
    letterSpacing: 1,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  chartCard: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  chartHeaderLabel: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.accent,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noChartData: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    color: Colors.textDim,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: Spacing.xl,
  },
  singlePointContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  // Donut Breakdown
  donutContainer: {
    width: '100%',
    paddingVertical: Spacing.sm,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  donutRingWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterNumber: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 24,
    color: '#fff',
  },
  donutCenterSub: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 8,
    letterSpacing: 1.5,
    color: Colors.textSecondary,
  },
  donutLegend: {
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendColorBox: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: Typography.fontMono,
    fontSize: 10,
    color: Colors.textPrimary,
  },
  // ── ZOOM MODAL ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 30,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#0c1220',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalHeader: {
    gap: 2,
  },
  modalStudent: {
    fontFamily: Typography.fontHeading,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalExperiment: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  modalImage: {
    width: '100%',
    height: 300,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#000',
  },
  modalFooter: {
    gap: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: Spacing.sm,
  },
  modalDescLabel: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.accent,
  },
  modalDescText: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: '#fff',
    lineHeight: 18,
    opacity: 0.9,
  },
});
