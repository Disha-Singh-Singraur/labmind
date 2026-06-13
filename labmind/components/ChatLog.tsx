import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import type { ChatMessage } from '../types';

interface ChatLogProps {
  messages: ChatMessage[];
}

function formatTime(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function ChatLog({ messages }: ChatLogProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Small delay to allow layout before scrolling
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, [messages]);

  if (messages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>// no messages yet</Text>
        <Text style={styles.emptySubtext}>Ask anything about this experiment step.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {messages.map((msg, idx) => {
        const isUser = msg.role === 'user';
        return (
          <View
            key={msg.id ?? idx}
            style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}
          >
            <View style={[styles.messageWrap, isUser ? styles.userWrap : styles.assistantWrap]}>
              <View style={styles.metaRow}>
                <Text style={styles.roleLabel}>
                  {isUser ? 'STUDENT' : 'LABMIND·AI'}
                </Text>
                <Text style={styles.timestamp}>{formatTime(msg.created_at)}</Text>
              </View>
              <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
                {msg.content}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
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
  messageRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  messageWrap: {
    maxWidth: '85%',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  userWrap: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'flex-end',
  },
  assistantWrap: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.accentDim,
    backgroundColor: Colors.card,
    alignItems: 'flex-start',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: Spacing.lg,
  },
  roleLabel: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: Colors.textDim,
  },
  timestamp: {
    fontFamily: Typography.fontMono,
    fontSize: 9,
    color: Colors.textDim,
  },
  messageText: {
    fontFamily: Typography.fontBody,
    fontSize: 14,
    lineHeight: 22,
  },
  userText: {
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  assistantText: {
    color: Colors.textPrimary,
    textAlign: 'left',
  },
});
