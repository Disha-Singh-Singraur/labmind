import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

interface SafetyWarningBannerProps {
  message: string;
  severity?: 'warning' | 'danger';
}

export function SafetyWarningBanner({ message, severity = 'warning' }: SafetyWarningBannerProps) {
  const isWarning = severity === 'warning';
  const symbol = isWarning ? '⚠' : '△';
  const borderColor = isWarning ? Colors.warning : Colors.danger;
  const bgColor = isWarning ? Colors.warningBg : Colors.dangerBg;
  const textColor = isWarning ? Colors.warning : Colors.danger;

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderLeftColor: borderColor }]}>
      <Text style={[styles.symbol, { color: textColor }]}>{symbol}</Text>
      <Text style={[styles.message, { color: textColor }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 2,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  symbol: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 1,
  },
  message: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
    flexWrap: 'wrap',
  },
});
