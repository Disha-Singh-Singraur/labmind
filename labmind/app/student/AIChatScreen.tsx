import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import type { StudentStackParamList, ChatMessage } from '../../types';
import { aiAPI, experimentsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { ChatLog } from '../../components/ChatLog';
import { AIThinkingIndicator } from '../../components/AIThinkingIndicator';

type Props = StackScreenProps<StudentStackParamList, 'AIChat'>;

export function AIChatScreen({ route, navigation }: Props) {
  const { sessionId, experimentId, currentStepTitle, experimentName } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async () => {
    const content = input.trim();
    if (!content || thinking) return;

    setInput('');
    setError(null);

    const userMessage: ChatMessage = { role: 'user', content, created_at: new Date().toISOString() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setThinking(true);

    try {
      const experiment = await experimentsAPI.getById(experimentId);
      const context = `${experiment.name}: ${experiment.objective}`;

      const apiMessages = updatedMessages.map((m) => ({ role: m.role, content: m.content }));

      const response = await aiAPI.chat({
        messages: apiMessages,
        experiment_context: context,
        current_step: currentStepTitle,
        session_id: sessionId,
        student_name: user?.full_name ?? 'Student',
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.reply,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to get AI response');
      // Remove the optimistic user message on failure
      setMessages(messages);
    } finally {
      setThinking(false);
    }
  }, [input, thinking, messages, experimentId, currentStepTitle, sessionId, user]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← BACK</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.expName} numberOfLines={1}>{experimentName}</Text>
            <Text style={styles.stepName} numberOfLines={1}>{currentStepTitle}</Text>
          </View>
          <View style={styles.aiStatus}>
            <View style={styles.aiDot} />
            <Text style={styles.aiStatusText}>AI</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Messages */}
        <View style={styles.chatContainer}>
          <ChatLog messages={messages} />
        </View>

        {/* Thinking indicator */}
        {thinking && (
          <View style={styles.thinkingBar}>
            <AIThinkingIndicator />
            <Text style={styles.thinkingText}>LabMind is thinking...</Text>
          </View>
        )}

        {/* Error */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>△ {error}</Text>
          </View>
        ) : null}

        {/* Input */}
        <View style={styles.inputSection}>
          <Text style={styles.contextLabel}>CONTEXT: {currentStepTitle.toUpperCase()}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about this step..."
              placeholderTextColor={Colors.textDim}
              multiline
              maxLength={500}
              editable={!thinking}
              returnKeyType="send"
              onSubmitEditing={send}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || thinking) && styles.sendBtnDisabled]}
              onPress={send}
              disabled={!input.trim() || thinking}
            >
              <Text style={[styles.sendBtnText, (!input.trim() || thinking) && styles.sendBtnTextDisabled]}>
                SEND
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  kav: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: {},
  backText: {
    fontFamily: Typography.fontMono,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.accent,
  },
  headerInfo: { flex: 1 },
  expName: {
    fontFamily: Typography.fontHeading,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  stepName: {
    fontFamily: Typography.fontMono,
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  aiStatus: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  aiDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  aiStatusText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.accent,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.xl },
  chatContainer: { flex: 1 },
  thinkingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  thinkingText: {
    fontFamily: Typography.fontMono,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  errorBanner: {
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.dangerBg,
    borderLeftWidth: 2,
    borderLeftColor: Colors.danger,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  errorText: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    color: Colors.danger,
  },
  inputSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
  },
  contextLabel: {
    fontFamily: Typography.fontMono,
    fontSize: 9,
    letterSpacing: 1.5,
    color: Colors.textDim,
  },
  inputRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-end' },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    fontFamily: Typography.fontBody,
    fontSize: 14,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: Colors.accentGlow,
    borderWidth: 1,
    borderColor: Colors.accentDim,
    borderBottomColor: Colors.accent,
    borderBottomWidth: 2,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  sendBtnDisabled: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
  },
  sendBtnText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: Colors.accent,
  },
  sendBtnTextDisabled: {
    color: Colors.textDim,
  },
});
