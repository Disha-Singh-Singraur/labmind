import React, { useEffect, useState, useCallback, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import type { StackScreenProps } from '@react-navigation/stack';
import { useAuth } from '../../context/AuthContext';
import { labSessionAPI, experimentsAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { GlassCard } from '../../components/GlassCard';
import type { StudentStackParamList, LabSessionListItem, Experiment } from '../../types';

type Props = StackScreenProps<StudentStackParamList, 'Dashboard'>;

function getSyncTime(): string {
  const n = new Date();
  const p = (v: number) => String(v).padStart(2, '0');
  return `${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
}

export function InstructorDashboardScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState<LabSessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState(getSyncTime());

  // New session modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadedExp, setUploadedExp] = useState<Experiment | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdSession, setCreatedSession] = useState<LabSessionListItem | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSessions = useCallback(async (show = true) => {
    if (show) setLoading(true);
    setError(null);
    try {
      const data = await labSessionAPI.list();
      setSessions(data);
      setLastSync(getSyncTime());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions(true);
    intervalRef.current = setInterval(() => fetchSessions(false), 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchSessions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSessions(false);
  }, [fetchSessions]);

  const closeForm = () => {
    setShowNewModal(false);
    setCreateError(null);
    setNewName('');
    setUploadedExp(null);
  };

  const handlePickPdf = async () => {
    setCreateError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      setUploadingPdf(true);
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.name ?? 'protocol.pdf',
        type: 'application/pdf',
      } as unknown as Blob);

      const exp = await experimentsAPI.uploadPDF(formData);
      setUploadedExp(exp);
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Failed to upload PDF');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) { setCreateError('Session name is required'); return; }
    if (!uploadedExp) { setCreateError('Upload a PDF protocol first'); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const result = await labSessionAPI.create(newName.trim(), uploadedExp.id);
      setCreatedSession(result);
      closeForm();
      await fetchSessions(false);
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  const activeSessions = sessions.filter(s => s.status === 'active');
  const closedSessions = sessions.filter(s => s.status === 'closed');

  const renderSessionCard = (s: LabSessionListItem) => {
    const isActive = s.status === 'active';
    const borderColor = isActive
      ? (s.alert_count > 0 ? Colors.warning : Colors.accent)
      : Colors.textDim;

    return (
      <TouchableOpacity
        key={s.session_id}
        activeOpacity={0.85}
        onPress={() => {
          navigation.navigate('LabSessionDetail', { sessionId: s.session_id });
        }}
      >
        <GlassCard style={[styles.sessionCard, { borderLeftColor: borderColor }]}>
          <View style={styles.sessionTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionName} numberOfLines={1}>{s.name}</Text>
              <Text style={styles.sessionExpName} numberOfLines={1}>{s.experiment_name}</Text>
            </View>
            {isActive && (
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{s.code}</Text>
              </View>
            )}
          </View>

          <View style={styles.sessionBottom}>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { borderColor: isActive ? Colors.accent : Colors.textDim }]}>
                <Text style={[styles.badgeText, { color: isActive ? Colors.accent : Colors.textDim }]}>
                  {s.student_count} STUDENTS
                </Text>
              </View>
              {s.alert_count > 0 && (
                <View style={[styles.badge, { borderColor: Colors.warning }]}>
                  <Text style={[styles.badgeText, { color: Colors.warning }]}>
                    ⚠ {s.alert_count} ALERT{s.alert_count > 1 ? 'S' : ''}
                  </Text>
                </View>
              )}
              {!isActive && (
                <View style={[styles.badge, { borderColor: Colors.textDim }]}>
                  <Text style={[styles.badgeText, { color: Colors.textDim }]}>CLOSED</Text>
                </View>
              )}
            </View>
            {isActive && (
              <Text style={styles.tapHint}>TAP TO MONITOR →</Text>
            )}
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  // ── NEW SESSION INLINE FORM ───────────────────────────────────────────────
  const renderNewSessionForm = () => (
    <GlassCard style={styles.formCard}>
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>NEW LAB SESSION</Text>
        <TouchableOpacity onPress={closeForm}>
          <Text style={styles.formClose}>✕</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.fieldLabel}>SESSION NAME</Text>
      <View style={styles.fieldInputWrapper}>
        <TextInput
          style={styles.fieldInput}
          placeholder="e.g. Monday Chemistry Lab"
          placeholderTextColor={Colors.textDim}
          value={newName}
          onChangeText={setNewName}
          autoCapitalize="words"
        />
      </View>

      <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>PDF PROTOCOL</Text>

      {/* Upload area */}
      <TouchableOpacity
        style={[
          styles.pdfUploadBox,
          uploadedExp ? styles.pdfUploadBoxDone : null,
        ]}
        onPress={handlePickPdf}
        disabled={uploadingPdf}
        activeOpacity={0.75}
      >
        {uploadingPdf ? (
          <>
            <ActivityIndicator color={Colors.accent} size="small" />
            <Text style={styles.pdfUploadLabel}>PARSING PDF…</Text>
          </>
        ) : uploadedExp ? (
          <>
            <Text style={styles.pdfCheckmark}>✓</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.pdfExpName} numberOfLines={2}>{uploadedExp.name}</Text>
              <Text style={styles.pdfTapToChange}>Tap to replace</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.pdfIcon}>⤒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.pdfUploadLabel}>TAP TO SELECT PDF</Text>
              <Text style={styles.pdfUploadSub}>The protocol will be parsed automatically</Text>
            </View>
          </>
        )}
      </TouchableOpacity>

      {createError && <Text style={styles.createError}>△ {createError}</Text>}

      <TouchableOpacity
        style={[styles.createBtn, (creating || !uploadedExp || !newName.trim()) && styles.createBtnDisabled]}
        onPress={handleCreate}
        disabled={creating || !uploadedExp || !newName.trim()}
      >
        {creating
          ? <ActivityIndicator color={Colors.accent} size="small" />
          : <Text style={styles.createBtnText}>CREATE SESSION</Text>
        }
      </TouchableOpacity>
    </GlassCard>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>INSTRUCTOR CONSOLE</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {user?.full_name ?? 'Instructor'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      {/* Sync row */}
      <View style={styles.syncRow}>
        <Text style={styles.syncText}>LAST SYNC {lastSync}</Text>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>△ {error}</Text>
        </View>
      )}

      {/* New Session Button */}
      <View style={styles.newBtnWrapper}>
        <TouchableOpacity
          style={[styles.newBtn, showNewModal && styles.newBtnActive]}
          onPress={() => setShowNewModal(v => !v)}
        >
          <Text style={styles.newBtnText}>{showNewModal ? '✕ CANCEL' : '+ NEW SESSION'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {/* Inline new session form */}
        {showNewModal && renderNewSessionForm()}

        {/* Code reveal card after creation */}
        {createdSession && (
          <GlassCard style={styles.codeRevealCard}>
            <Text style={styles.codeRevealLabel}>SESSION CREATED · TAP CODE TO COPY</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleCopyCode(createdSession.code)}
              style={styles.bigCodeBox}
            >
              <Text style={styles.bigCode}>{createdSession.code}</Text>
              <Text style={styles.copyHint}>
                {copied ? 'COPIED!' : 'TAP TO COPY'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.codeRevealName}>{createdSession.name}</Text>
            <Text style={styles.codeRevealExp}>{createdSession.experiment_name}</Text>
            <View style={styles.codeRevealActions}>
              <TouchableOpacity
                style={styles.codeRevealBtn}
                onPress={() => {
                  const id = createdSession.session_id;
                  setCreatedSession(null);
                  navigation.navigate('LabSessionDetail', { sessionId: id });
                }}
              >
                <Text style={styles.codeRevealBtnText}>OPEN SESSION →</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCreatedSession(null)}>
                <Text style={styles.codeRevealDismiss}>DISMISS</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}

        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.accent} size="large" />
          </View>
        ) : (
          <>
            {/* Active sessions */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>ACTIVE SESSIONS</Text>
                <Text style={styles.sectionCount}>{activeSessions.length} ACTIVE</Text>
              </View>
              {activeSessions.length === 0 ? (
                <GlassCard style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No active sessions</Text>
                  <Text style={styles.emptySub}>Tap "+ NEW SESSION" to get started</Text>
                </GlassCard>
              ) : (
                activeSessions.map(renderSessionCard)
              )}
            </View>

            {/* Closed sessions */}
            {closedSessions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabelDim}>CLOSED SESSIONS</Text>
                {closedSessions.map(renderSessionCard)}
              </View>
            )}
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
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#0c1220',
  },
  headerLeft: { flex: 1, gap: 2 },
  title: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 16,
    letterSpacing: 2,
    color: Colors.accent,
  },
  subtitle: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginLeft: Spacing.md,
  },
  logoutText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.textSecondary,
  },
  syncRow: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 6,
    backgroundColor: '#080C14',
  },
  syncText: {
    fontFamily: Typography.fontMono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 1,
  },
  errorBanner: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.dangerBg,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  errorText: { fontFamily: Typography.fontBody, fontSize: 12, color: Colors.danger },
  newBtnWrapper: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: '#080C14',
  },
  newBtn: {
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  newBtnActive: { backgroundColor: 'rgba(255,255,255,0.04)' },
  newBtnText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 13,
    letterSpacing: 2,
    color: Colors.accent,
  },
  scroll: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: 48 },
  center: { paddingVertical: 64, alignItems: 'center' },
  section: { gap: Spacing.md },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontFamily: Typography.fontMonoBold, fontSize: 10, letterSpacing: 2, color: Colors.accent },
  sectionCount: { fontFamily: Typography.fontMono, fontSize: 10, color: Colors.accent },
  sectionLabelDim: { fontFamily: Typography.fontMonoBold, fontSize: 10, letterSpacing: 2, color: Colors.textDim, marginBottom: Spacing.sm },

  // Session card
  sessionCard: { borderLeftWidth: 3, padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  sessionTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  sessionName: { fontFamily: Typography.fontHeading, fontSize: 15, color: Colors.textPrimary, fontWeight: 'bold' },
  sessionExpName: { fontFamily: Typography.fontBody, fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  codeBox: { borderWidth: 1, borderColor: Colors.accent, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4, backgroundColor: Colors.accentGlow },
  codeText: { fontFamily: Typography.fontMonoBold, fontSize: 14, color: Colors.accent, letterSpacing: 3 },
  sessionBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgeRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  badge: { borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontFamily: Typography.fontMonoBold, fontSize: 8, letterSpacing: 0.5 },
  tapHint: { fontFamily: Typography.fontMono, fontSize: 9, color: Colors.textDim, letterSpacing: 1 },

  // Empty
  emptyCard: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontFamily: Typography.fontHeading, fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
  emptySub: { fontFamily: Typography.fontBody, fontSize: 12, color: Colors.textDim, textAlign: 'center', paddingHorizontal: Spacing.lg },

  // Inline new session form
  formCard: { padding: Spacing.xl, gap: Spacing.md },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formTitle: { fontFamily: Typography.fontMonoBold, fontSize: 12, letterSpacing: 2, color: Colors.textPrimary },
  formClose: { fontFamily: Typography.fontBody, fontSize: 18, color: Colors.textSecondary, padding: 4 },
  fieldLabel: { fontFamily: Typography.fontMonoBold, fontSize: 9, letterSpacing: 1.5, color: Colors.textSecondary, marginBottom: 4 },
  fieldLabel2: { fontFamily: Typography.fontMonoBold, fontSize: 9, letterSpacing: 1, color: Colors.textDim, marginBottom: 4 },
  fieldInputWrapper: { borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: BorderRadius.sm, backgroundColor: '#080C14', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  fieldInputText: { fontFamily: Typography.fontBody, fontSize: 14, color: Colors.textPrimary },
  fieldInput: {
    flex: 1,
    fontFamily: Typography.fontBody,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 4 : 0,
  },
  // PDF upload box
  pdfUploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.sm,
    backgroundColor: '#080C14',
    padding: Spacing.md,
    minHeight: 62,
  },
  pdfUploadBoxDone: {
    borderColor: Colors.accent,
    borderStyle: 'solid',
    backgroundColor: Colors.accentGlow,
  },
  pdfIcon: { fontSize: 22, color: Colors.textDim },
  pdfCheckmark: { fontSize: 20, color: Colors.accent },
  pdfUploadLabel: { fontFamily: Typography.fontMonoBold, fontSize: 11, letterSpacing: 1.5, color: Colors.textSecondary },
  pdfUploadSub: { fontFamily: Typography.fontBody, fontSize: 11, color: Colors.textDim, marginTop: 2 },
  pdfExpName: { fontFamily: Typography.fontBody, fontSize: 13, color: Colors.accent, fontWeight: '600' },
  pdfTapToChange: { fontFamily: Typography.fontBody, fontSize: 10, color: Colors.textDim, marginTop: 2 },
  createError: { fontFamily: Typography.fontBody, fontSize: 12, color: Colors.danger },
  createBtn: { borderWidth: 1, borderColor: Colors.accent, borderRadius: BorderRadius.sm, paddingVertical: 14, alignItems: 'center', backgroundColor: Colors.accentGlow },
  createBtnDisabled: { opacity: 0.35 },
  createBtnText: { fontFamily: Typography.fontMonoBold, fontSize: 13, letterSpacing: 2, color: Colors.accent },

  // Code reveal
  codeRevealCard: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.md, borderWidth: 1, borderColor: Colors.accent },
  codeRevealLabel: { fontFamily: Typography.fontMonoBold, fontSize: 9, letterSpacing: 2, color: Colors.textSecondary },
  bigCodeBox: { borderWidth: 1.5, borderColor: Colors.accent, borderRadius: BorderRadius.sm, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.accentGlow, alignItems: 'center', minWidth: 160 },
  bigCode: { fontFamily: Typography.fontMonoBold, fontSize: 28, letterSpacing: 6, color: Colors.accent, textAlign: 'center' },
  copyHint: { fontFamily: Typography.fontMonoBold, fontSize: 8, letterSpacing: 1, color: Colors.textDim, marginTop: 4 },
  codeRevealName: { fontFamily: Typography.fontHeading, fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary },
  codeRevealExp: { fontFamily: Typography.fontBody, fontSize: 12, color: Colors.textSecondary },
  codeRevealActions: { alignItems: 'center', gap: Spacing.sm },
  codeRevealBtn: { borderWidth: 1, borderColor: Colors.accent, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.accentGlow },
  codeRevealBtnText: { fontFamily: Typography.fontMonoBold, fontSize: 12, letterSpacing: 2, color: Colors.accent },
  codeRevealDismiss: { fontFamily: Typography.fontMono, fontSize: 10, color: Colors.textDim, letterSpacing: 1, paddingVertical: Spacing.sm },
});
