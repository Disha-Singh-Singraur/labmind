import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

interface ConfidenceScoreBadgeProps {
  score: number;
}

export function ConfidenceScoreBadge({ score }: ConfidenceScoreBadgeProps) {
  let color: string;
  let bgColor: string;

  if (score >= 80) {
    color = Colors.success;
    bgColor = Colors.successBg;
  } else if (score >= 50) {
    color = Colors.warning;
    bgColor = Colors.warningBg;
  } else {
    color = Colors.danger;
    bgColor = Colors.dangerBg;
  }

  const displayScore = score.toFixed(1);

  return (
    <View style={[styles.badge, { backgroundColor: bgColor, borderColor: color }]}>
      <Text style={[styles.score, { color }]}>{displayScore}% CONF</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    alignSelf: 'flex-start',
  },
  score: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 14,
    letterSpacing: 0.08 * 14,
  },
});
